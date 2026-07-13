package cm.afriland.copilotehadj.service;

import java.security.SecureRandom;

/** Générateurs d'identifiants, codes encadreur et mots de passe pèlerin. */
public final class Ids {
    private static final SecureRandom RNG = new SecureRandom();
    private static final String ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String PWD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private Ids() {}

    public static String bordereauId(long sequence) {
        return String.format("BOR-%04d", sequence);
    }

    public static String receiptNumber(long sequence) {
        return "RC-" + (2000 + sequence);
    }

    public static String versementId() {
        return "VER-" + System.currentTimeMillis() + "-" + (RNG.nextInt(9000) + 1000);
    }

    public static String encadreurId(long sequence) {
        return String.format("ENC-%03d", sequence);
    }

    /** Code encadreur : 3 caractères alphanumériques. */
    public static String encadreurCode() {
        StringBuilder sb = new StringBuilder(3);
        for (int i = 0; i < 3; i++) sb.append(ALNUM.charAt(RNG.nextInt(ALNUM.length())));
        return sb.toString();
    }

    /** Mot de passe pèlerin : 8 caractères lisibles (sans I, O, 0, 1...). */
    public static String pilgrimPassword() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) sb.append(PWD_CHARS.charAt(RNG.nextInt(PWD_CHARS.length())));
        return sb.toString();
    }

    public static String otp() {
        return String.format("%06d", RNG.nextInt(1_000_000));
    }
}
