use crate::middleware::auth::AppError;
use reqwest::{Client, StatusCode};
use serde::Deserialize;

#[derive(Debug)]
pub struct ErpStudentProfile {
    pub roll_no: String,
    pub full_name: String,
    pub course_name: String,
}

#[derive(Debug)]
pub enum ErpError {
    Credentials,
    Unavailable,
    Profile,
}
impl ErpError {
    pub fn into_app_error(self) -> AppError {
        match self {
            Self::Credentials => AppError(
                axum::http::StatusCode::UNAUTHORIZED,
                "Invalid ERP credentials".into(),
            ),
            Self::Unavailable => AppError(
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                "College ERP is unavailable; retry later".into(),
            ),
            Self::Profile => AppError(
                axum::http::StatusCode::BAD_GATEWAY,
                "College ERP returned an invalid student profile".into(),
            ),
        }
    }
}

#[derive(Deserialize)]
struct DashboardResponse {
    #[serde(rename = "profileDetails")]
    profile_details: Option<ProfileDetailsRaw>,
}
#[derive(Deserialize)]
struct ProfileDetailsRaw {
    #[serde(rename = "rollNo")]
    roll_no: Option<String>,
    #[serde(rename = "firstName")]
    first_name: Option<String>,
    #[serde(rename = "courseName")]
    course_name: Option<String>,
}

pub struct ErpClient {
    base_url: String,
}
impl ErpClient {
    pub fn new(base_url: String) -> Self {
        Self { base_url }
    }

    pub async fn login_and_fetch_profile(
        &self,
        username: &str,
        password: &str,
    ) -> Result<ErpStudentProfile, ErpError> {
        // Each login gets its own cookie jar, preventing ERP sessions from crossing users.
        let client = Client::builder()
            .cookie_store(true)
            .connect_timeout(std::time::Duration::from_secs(5))
            .timeout(std::time::Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|_| ErpError::Unavailable)?;
        let login_url = format!("{}/j_spring_security_check", self.base_url);
        let response = client
            .post(&login_url)
            .header("Origin", &self.base_url)
            .header("Referer", format!("{}/login.htm", self.base_url))
            .form(&[("j_username", username.trim()), ("j_password", password)])
            .send()
            .await
            .map_err(|_| ErpError::Unavailable)?;
        match response.status() {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => return Err(ErpError::Credentials),
            status if status.is_server_error() => return Err(ErpError::Unavailable),
            status if status.is_redirection() => {
                let base = reqwest::Url::parse(&self.base_url).map_err(|_| ErpError::Profile)?;
                let redirect = response
                    .headers()
                    .get("Location")
                    .and_then(|h| h.to_str().ok())
                    .and_then(|location| base.join(location).ok())
                    .ok_or(ErpError::Profile)?;
                // Do not follow ERP redirects to arbitrary hosts or downgrade HTTPS.
                if redirect.origin() != base.origin() {
                    return Err(ErpError::Profile);
                }
                if redirect.as_str().contains("login") {
                    return Err(ErpError::Credentials);
                }
                let result = client
                    .get(redirect)
                    .send()
                    .await
                    .map_err(|_| ErpError::Unavailable)?;
                if result.status().is_server_error() {
                    return Err(ErpError::Unavailable);
                }
            }
            status if !status.is_success() => return Err(ErpError::Profile),
            _ => {}
        }
        let mut response = client
            .get(format!(
                "{}/stu_getStudentDashboardDetails.json",
                self.base_url
            ))
            .header("Accept", "application/json")
            .header("X-Requested-With", "XMLHttpRequest")
            .header(
                "Referer",
                format!("{}/stu_studentDashboard.htm", self.base_url),
            )
            .send()
            .await
            .map_err(|_| ErpError::Unavailable)?;
        match response.status() {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => return Err(ErpError::Credentials),
            status if status.is_server_error() => return Err(ErpError::Unavailable),
            status if status.is_redirection() => return Err(ErpError::Credentials),
            status if !status.is_success() => return Err(ErpError::Profile),
            _ => {}
        }
        let mut body = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|_| ErpError::Unavailable)? {
            if body.len() + chunk.len() > 256 * 1024 {
                return Err(ErpError::Profile);
            }
            body.extend_from_slice(&chunk);
        }
        if body.starts_with(b"<") {
            return Err(ErpError::Credentials);
        }
        let dashboard: DashboardResponse =
            serde_json::from_slice(&body).map_err(|_| ErpError::Profile)?;
        let details = dashboard.profile_details.ok_or(ErpError::Credentials)?;
        let profile = ErpStudentProfile {
            roll_no: details.roll_no.unwrap_or_default().trim().to_uppercase(),
            full_name: details.first_name.unwrap_or_default().trim().to_string(),
            course_name: details.course_name.unwrap_or_default().trim().to_string(),
        };
        if profile.roll_no.is_empty()
            || profile.roll_no.len() > 100
            || !profile
                .roll_no
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-')
            || profile.full_name.is_empty()
            || profile.full_name.len() > 200
            || profile.course_name.is_empty()
            || profile.course_name.len() > 200
        {
            return Err(ErpError::Profile);
        }
        Ok(profile)
    }
}
