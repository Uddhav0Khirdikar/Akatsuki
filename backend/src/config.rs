use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub allowed_email_domains: Vec<String>,
    pub enforce_college_domain: bool,
    pub erp_base_url: String,
    pub allow_local_auth: bool,
    pub seed_demo_data: bool,
    pub allowed_origins: Vec<axum::http::HeaderValue>,
}

impl Config {
    pub fn init() -> Result<Self, String> {
        dotenvy::dotenv().ok();
        let jwt_secret = env::var("JWT_SECRET").map_err(|_| "JWT_SECRET is required")?;
        if jwt_secret.len() < 32 || jwt_secret == "super_secret_college_erp_jwt_key_2026" {
            return Err("JWT_SECRET must be a unique secret of at least 32 bytes".into());
        }
        let allow_local_auth = boolean("ALLOW_LOCAL_AUTH", false)?;
        let seed_demo_data = boolean("SEED_DEMO_DATA", false)?;
        if seed_demo_data && !allow_local_auth {
            return Err("SEED_DEMO_DATA requires ALLOW_LOCAL_AUTH=true (development only)".into());
        }
        let erp_base_url =
            env::var("ERP_BASE_URL").unwrap_or_else(|_| "https://erp.mit.asia".into());
        let erp_url = reqwest::Url::parse(&erp_base_url).map_err(|_| "Invalid ERP_BASE_URL")?;
        if erp_url.scheme() != "https"
            || erp_url.host_str().is_none()
            || !erp_url.username().is_empty()
            || erp_url.password().is_some()
            || erp_url.query().is_some()
            || erp_url.fragment().is_some()
            || erp_url.path() != "/"
        {
            return Err(
                "ERP_BASE_URL must be an HTTPS origin without credentials, path, query or fragment"
                    .into(),
            );
        }
        let mut allowed_origins = Vec::new();
        for origin in env::var("ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".into())
            .split(',')
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            let url = reqwest::Url::parse(origin).map_err(|_| "Invalid ALLOWED_ORIGINS")?;
            if !matches!(url.scheme(), "http" | "https")
                || url.origin().ascii_serialization() != origin
            {
                return Err("ALLOWED_ORIGINS must contain exact HTTP(S) origins".into());
            }
            allowed_origins.push(origin.parse().map_err(|_| "Invalid origin header")?);
        }
        Ok(Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "5000".into())
                .parse()
                .map_err(|_| "PORT must be a valid port number")?,
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://campus_jobs.db".into()),
            jwt_secret,
            allowed_email_domains: env::var("ALLOWED_EMAIL_DOMAINS")
                .unwrap_or_else(|_| "mit.asia".into())
                .split(',')
                .map(|s| s.trim().to_lowercase())
                .filter(|s| !s.is_empty())
                .collect(),
            enforce_college_domain: boolean("ENFORCE_COLLEGE_DOMAIN", true)?,
            erp_base_url: erp_base_url.trim_end_matches('/').into(),
            allow_local_auth,
            seed_demo_data,
            allowed_origins,
        })
    }
}

fn boolean(key: &str, default: bool) -> Result<bool, String> {
    match env::var(key) {
        Err(env::VarError::NotPresent) => Ok(default),
        Ok(value) if value.eq_ignore_ascii_case("true") => Ok(true),
        Ok(value) if value.eq_ignore_ascii_case("false") => Ok(false),
        _ => Err(format!("{key} must be true or false")),
    }
}
