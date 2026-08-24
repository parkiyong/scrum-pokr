package com.scrumpokr.server.util;

import java.security.SecureRandom;

public class SlugGenerator {

    private static final String CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateSlug() {
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            int idx = RANDOM.nextInt(CROCKFORD_ALPHABET.length());
            sb.append(CROCKFORD_ALPHABET.charAt(idx));
        }
        return sb.toString();
    }

    public static String generateShortCode(String slug) {
        if (slug.length() >= 6) {
            return slug.substring(0, 3) + "-" + slug.substring(3, 6);
        }
        return slug;
    }
}
