use rand::seq::SliceRandom;
use rand::Rng;

const PREFIXES: &[&str] = &[
    "SWB", "FOX", "ZBE", "LNX", "BAD", "OWL", "CAT", "DOG", "ELK", "HAW", "JAG", "PAN", "RHI",
    "WLF", "EAG", "DOL", "KOA", "TIG", "BEA", "BTO", "VIP", "ZEN", "ACE", "PRO", "DEV", "OPS",
    "AGI", "SPR", "MAX", "SKY",
];

pub fn generate_slug() -> String {
    let mut rng = rand::thread_rng();
    let prefix = PREFIXES.choose(&mut rng).unwrap_or(&"SWB");
    let num: u32 = rng.gen_range(10..99);
    format!("{}-{}", prefix, num)
}

pub fn generate_short_code(slug: &str) -> String {
    slug.trim().to_ascii_uppercase()
}

pub fn validate_slug(slug: &str) -> bool {
    let trimmed = slug.trim();
    !trimmed.is_empty()
        && trimmed.len() <= 32
        && trimmed
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slug_generation() {
        let code = generate_slug();
        assert!(validate_slug(&code));
        assert_eq!(code.len(), 6);
        assert!(code.contains('-'));
        assert_eq!(generate_short_code(&code), code);
    }
}
