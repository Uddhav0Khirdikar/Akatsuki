use crate::config::Config;

pub fn validate_college_email(email: &str, config: &Config) -> Result<(), String> {
    if !email.contains('@') || !email.contains('.') {
        return Err("Invalid email address format.".to_string());
    }

    if !config.enforce_college_domain {
        return Ok(());
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err("Invalid email address format.".to_string());
    }

    let domain = parts[1].to_lowercase();
    let is_allowed = config.allowed_email_domains.iter().any(|allowed| {
        domain == *allowed || domain.ends_with(&format!(".{}", allowed))
    });

    if !is_allowed {
        return Err(format!(
            "Email domain '@{}' is not authorized. Allowed institutional domains: {}",
            domain,
            config.allowed_email_domains.join(", ")
        ));
    }

    Ok(())
}

pub fn normalize_roll_number(roll_number: &str) -> String {
    roll_number.trim().to_uppercase()
}
