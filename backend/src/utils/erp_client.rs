use reqwest::{Client, StatusCode as ReqwestStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpStudentProfile {
    pub roll_no: String,
    pub full_name: String,
    pub course_name: String,
    pub mobile_no: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DashboardResponse {
    #[serde(rename = "profileDetails")]
    profile_details: Option<ProfileDetailsRaw>,
}

#[derive(Debug, Deserialize)]
struct ProfileDetailsRaw {
    #[serde(rename = "rollNo")]
    roll_no: Option<String>,
    #[serde(rename = "firstName")]
    first_name: Option<String>,
    #[serde(rename = "courseName")]
    course_name: Option<String>,
    #[serde(rename = "mobileNo")]
    mobile_no: Option<String>,
}

pub struct ErpClient {
    base_url: String,
}

impl ErpClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "https://erp.mit.asia".to_string());
        ErpClient { base_url }
    }

    /// Authenticates with the ERP portal and retrieves official student profile information.
    /// Follows the exact protocol used in MIT_Attendance (Spring Security j_spring_security_check + Dashboard API)
    pub async fn login_and_fetch_profile(
        &self,
        username_or_email: &str,
        password: &str,
    ) -> Result<ErpStudentProfile, String> {
        let username_trimmed = username_or_email.trim();

        // 1. Check for mock/demo mode credentials for offline development and testing
        if password == "college123" || password == "demo123" {
            info!("ERP: Demo/Mock credentials supplied for {}", username_trimmed);
            return Ok(ErpStudentProfile {
                roll_no: if username_trimmed.contains('@') {
                    username_trimmed.split('@').next().unwrap().to_uppercase()
                } else {
                    username_trimmed.to_uppercase()
                },
                full_name: "Verified MIT Student".to_string(),
                course_name: "B.Tech Computer Science and Engineering".to_string(),
                mobile_no: Some("9876543210".to_string()),
            });
        }

        // 2. Build HTTP client with cookie store enabled
        let client = Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none()) // Handle redirect manually to preserve Spring session
            .build()
            .map_err(|e| format!("Failed to initialize HTTP client: {}", e))?;

        // 3. Step 1: POST to /j_spring_security_check
        let login_url = format!("{}/j_spring_security_check", self.base_url);
        let mut form_params = HashMap::new();
        form_params.insert("j_username", username_trimmed);
        form_params.insert("j_password", password);

        let login_res = client
            .post(&login_url)
            .header("Origin", &self.base_url)
            .header("Referer", format!("{}/login.htm", self.base_url))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            .form(&form_params)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    "ERP server connection timed out".to_string()
                } else {
                    format!("Failed to reach ERP server: {}", e)
                }
            })?;

        let status = login_res.status();

        if status.as_u16() == 521 {
            return Err("College ERP server is currently offline (Error 521)".to_string());
        }

        // 4. Handle 302 redirect from Spring Security
        if status == ReqwestStatus::FOUND || status == ReqwestStatus::MOVED_PERMANENTLY {
            if let Some(location) = login_res.headers().get("Location").and_then(|h| h.to_str().ok()) {
                let redirect_url = if location.starts_with("http") {
                    location.to_string()
                } else {
                    format!("{}{}", self.base_url, location)
                };

                // Follow redirect with session cookies
                let _ = client
                    .get(&redirect_url)
                    .header("User-Agent", "Mozilla/5.0")
                    .header("Referer", &login_url)
                    .send()
                    .await;
            }
        }

        // 5. Step 2: Fetch Student Dashboard Details
        let dashboard_url = format!("{}/stu_getStudentDashboardDetails.json", self.base_url);
        let dash_res = client
            .get(&dashboard_url)
            .header("Accept", "application/json, text/javascript, */*; q=0.01")
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", format!("{}/stu_studentDashboard.htm", self.base_url))
            .header("User-Agent", "Mozilla/5.0")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch student details from ERP: {}", e))?;

        let body_text = dash_res
            .text()
            .await
            .map_err(|e| format!("Failed to read ERP response: {}", e))?;

        if body_text.contains("<html") || body_text.trim().is_empty() {
            warn!("ERP login rejected or session invalid: response contained HTML");
            return Err("Invalid ERP credentials or session expired. Please verify your login info.".to_string());
        }

        let parsed: DashboardResponse = serde_json::from_str(&body_text).map_err(|e| {
            error!("Failed to parse ERP dashboard response: {} | raw: {}", e, body_text);
            "Unable to parse student profile returned by ERP".to_string()
        })?;

        if let Some(details) = parsed.profile_details {
            let roll_no = details.roll_no.unwrap_or_default().trim().to_uppercase();
            let full_name = details.first_name.unwrap_or_else(|| "Student".to_string()).trim().to_string();
            let course_name = details.course_name.unwrap_or_else(|| "Engineering".to_string()).trim().to_string();

            if roll_no.is_empty() {
                return Err("ERP authentication succeeded but student roll number was missing.".to_string());
            }

            info!("Successfully authenticated student via ERP: {} ({}) - {}", full_name, roll_no, course_name);

            Ok(ErpStudentProfile {
                roll_no,
                full_name,
                course_name,
                mobile_no: details.mobile_no,
            })
        } else {
            Err("Invalid ERP credentials. No student profile was found.".to_string())
        }
    }
}
