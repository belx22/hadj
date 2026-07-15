package cm.afriland.copilotehadj.seed;

import cm.afriland.copilotehadj.entity.*;
import cm.afriland.copilotehadj.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Injecte le jeu de données initial au démarrage si la base est vide (comptes,
 * encadreurs, saisons, quelques bordereaux avec versements). C'est la seule
 * source de données de l'application : le frontend n'en embarque aucune.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final AppUserRepository users;
    private final EncadreurRepository encadreurs;
    private final SeasonRepository seasons;
    private final BordereauRepository bordereaux;
    private final SmtpSettingsRepository smtp;
    private final PasswordEncoder encoder;
    private final boolean enabled;

    public DataSeeder(AppUserRepository users, EncadreurRepository encadreurs, SeasonRepository seasons,
                      BordereauRepository bordereaux, SmtpSettingsRepository smtp, PasswordEncoder encoder,
                      @Value("${copilote.seed.enabled:true}") boolean enabled) {
        this.users = users;
        this.encadreurs = encadreurs;
        this.seasons = seasons;
        this.bordereaux = bordereaux;
        this.smtp = smtp;
        this.encoder = encoder;
        this.enabled = enabled;
    }

    private static final int CURRENT_SEASON = 2027;
    private static final long DEFAULT_PRICE = 3_500_000L;

    @Override
    public void run(String... args) {
        if (!enabled || users.count() > 0) return;

        seedUsers();
        seedEncadreurs();
        seedSeasons();
        seedSmtp();
        seedBordereaux();
    }

    private void seedUsers() {
        users.saveAll(List.of(
                user("U-1", "superviseur", "superviseur123", "SUPERVISEUR", "Marie Etoundi", "marie.etoundi@afrilandfirstbank.cm", "Yaoundé - Siège", null),
                user("U-2", "gestionnaire", "gestionnaire123", "GESTIONNAIRE_HADJ", "Ibrahim Njoya", "ibrahim.njoya@afrilandfirstbank.cm", "Yaoundé - Siège", null),
                user("U-3", "operateur", "operateur123", "OPERATEUR_HADJ", "Paul Mbarga", "paul.mbarga@afrilandfirstbank.cm", "Douala - Akwa", null),
                user("U-4", "encadreur1", "encadreur123", "ENCADREUR", "El Hadj Oumarou Sanda", "oumarou.sanda@afrilandfirstbank.cm", null, "ENC-001"),
                user("U-5", "admin", "admin123", "ADMIN_DSI", "Sandrine Fouda", "sandrine.fouda@afrilandfirstbank.cm", "Yaoundé - Siège", null)
        ));
    }

    private AppUser user(String id, String username, String pwd, String role, String name, String email, String agency, String encadreurId) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setPassword(encoder.encode(pwd));
        u.setRole(role);
        u.setName(name);
        u.setEmail(email);
        u.setAgency(agency);
        u.setEncadreurId(encadreurId);
        u.setActive(true);
        return u;
    }

    private void seedEncadreurs() {
        encadreurs.saveAll(List.of(
                encadreur("ENC-001", "El Hadj Oumarou Sanda", "Nord", "OS1", "110234501"),
                encadreur("ENC-002", "El Hadj Bello Ibrahim", "Extrême-Nord", "BI2", "110234502"),
                encadreur("ENC-003", "Hadja Fatimatou Njoya", "Ouest", "FN3", "110234503"),
                encadreur("ENC-004", "El Hadj Souleymanou Abba", "Adamaoua", "SA4", "110234504"),
                encadreur("ENC-005", "Hadja Aïssatou Bakari", "Centre", "AB5", "110234505"),
                encadreur("ENC-006", "El Hadj Moussa Alioum", "Littoral", "MA6", "110234506")
        ));
    }

    private Encadreur encadreur(String id, String name, String region, String code, String idNumber) {
        Encadreur e = new Encadreur();
        e.setId(id);
        e.setName(name);
        e.setRegion(region);
        e.setCode(code);
        e.setIdNumber(idNumber);
        e.setActive(true);
        return e;
    }

    private void seedSeasons() {
        Season current = new Season();
        current.setSeason(CURRENT_SEASON);
        current.setMonth(6);
        current.setYear(CURRENT_SEASON);
        current.setOpen(true);
        current.setPrices(new HashMap<>(Map.of("PELERIN", DEFAULT_PRICE, "ENCADREUR", DEFAULT_PRICE, "OFFICIEL", 3_000_000L, "GUH", 3_000_000L)));
        current.setOfficialPriceExcludingCommission(3_300_000L);
        current.setCommissionPerPilgrim(200_000L);

        Season prev = new Season();
        prev.setSeason(CURRENT_SEASON - 1);
        prev.setMonth(6);
        prev.setYear(CURRENT_SEASON - 1);
        prev.setOpen(false);
        prev.setPrices(new HashMap<>(Map.of("PELERIN", 3_200_000L, "ENCADREUR", 3_200_000L, "OFFICIEL", 2_800_000L, "GUH", 2_800_000L)));
        prev.setOfficialPriceExcludingCommission(3_000_000L);
        prev.setCommissionPerPilgrim(200_000L);

        seasons.saveAll(List.of(current, prev));
    }

    private void seedSmtp() {
        SmtpSettings s = new SmtpSettings();
        s.setId(1);
        s.setHost("smtp.afrilandfirstbank.cm");
        s.setPort(587);
        s.setFromName("Copilote Hadj");
        s.setFromEmail("no-reply@afrilandfirstbank.cm");
        s.setUseTls(true);
        s.setOtpTtlMinutes(10);
        smtp.save(s);
    }

    private void seedBordereaux() {
        // Quelques dossiers représentatifs avec versements validés/en attente.
        bordereaux.save(bordereau(1, "Abba", "Fadimatou", "699112233", "1002345678", "Extrême-Nord",
                "Maroua - Centre", "ENC-002", "PELERIN", false, "ACCORDE",
                List.of(versement(3_500_000L, "AGENCE", "VALIDE"))));
        bordereaux.save(bordereau(2, "Bakari", "Oumar", "677889900", "1002345679", "Centre",
                "Yaoundé - Siège", "ENC-005", "PELERIN", false, "EN_COURS",
                List.of(versement(2_000_000L, "MOBILE_MONEY_ORANGE", "VALIDE"), versement(500_000L, "MOBILE_MONEY_MTN", "PENDING"))));
        bordereaux.save(bordereau(3, "Njoya", "Aïcha", "655667788", "1002345680", "Ouest",
                "Bafoussam - Centre", "ENC-003", "PELERIN", false, "EN_ATTENTE",
                List.of(versement(1_000_000L, "AGENCE", "VALIDE"))));
        bordereaux.save(bordereau(4, "Issa", "Moussa", "699009988", "1002345685", "Adamaoua",
                "Ngaoundéré - Centre", "ENC-004", "PELERIN", true, "ACCORDE",
                List.of(versement(3_700_000L, "AGENCE", "VALIDE"))));
    }

    private Bordereau bordereau(int seq, String lastName, String firstName, String phone, String idNumber,
                                String region, String agency, String encadreurId, String type, boolean fees,
                                String visaStatus, List<Versement> vers) {
        Bordereau b = new Bordereau();
        b.setId(String.format("BOR-%04d", seq));
        b.setReceiptNumber("RC-" + (2000 + seq));
        b.setReference("CPT-10000" + seq);
        b.setSource("AGENT");
        b.setPilgrimLastName(lastName);
        b.setPilgrimFirstName(firstName);
        b.setPhone(phone);
        b.setIdNumber(idNumber);
        b.setRegion(region);
        b.setAgency(agency);
        b.setEncadreurId(encadreurId);
        b.setPilgrimType(type);
        b.setPilgrimStatus("NOUVEAU");
        b.setIncludesEncadreurFees(fees);
        b.setPilgrimCount(1);
        b.setSeason(CURRENT_SEASON);
        b.setOnlinePriority(false);
        b.setCreatedAt(LocalDate.of(CURRENT_SEASON, 2, 5));
        b.setVisaStatus(visaStatus);
        vers.forEach(b::addVersement);
        StatusHistory h = new StatusHistory();
        h.setStatus(visaStatus);
        h.setDate(LocalDate.of(CURRENT_SEASON, 2, 5).toString());
        b.addStatusHistory(h);
        return b;
    }

    private Versement versement(long amount, String method, String status) {
        Versement v = new Versement();
        v.setId("VER-" + UUID.randomUUID().toString().substring(0, 8));
        v.setAmount(amount);
        v.setMethod(method);
        v.setReference("REF-" + (100000 + (int) (amount % 100000)));
        v.setStatus(status);
        v.setCreatedAt(LocalDate.of(CURRENT_SEASON, 2, 5));
        if ("VALIDE".equals(status)) {
            v.setValidatedAt(LocalDate.of(CURRENT_SEASON, 2, 5));
            v.setValidatedBy("operateur");
        }
        return v;
    }
}
