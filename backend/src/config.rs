use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub allowed_email_domains: Vec<String>,
    pub enforce_college_domain: bool,
    pub erp_base_url: String,
}

impl Config {
    pub fn init() -> Self {
        dotenvy::dotenv().ok();

        let port = env::var("PORT")
            .unwrap_or_else(|_| "5000".to_string())
            .parse::<u16>()
            .unwrap_or(5000);

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://campus_jobs.db".to_string());

        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "super_secret_college_erp_jwt_key_2026".to_string());

        let allowed_email_domains = env::var("ALLOWED_EMAIL_DOMAINS")
            .unwrap_or_else(|_| "college.edu,campus.ac.in,univ.edu,student.college.edu,mit.asia".to_string())
            .split(',')
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty())
            .collect();

        let enforce_college_domain = env::var("ENFORCE_COLLEGE_DOMAIN")
            .map(|val| val.to_lowercase() == "true")
            .unwrap_or(false);

        let erp_base_url = env::var("ERP_BASE_URL")
            .unwrap_or_else(|_| "https://erp.mit.asia".to_string());

        Config {
            port,
            database_url,
            jwt_secret,
            allowed_email_domains,
            enforce_college_domain,
            erp_base_url,
        }
    }
}
