package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.*;
import cm.afriland.copilotehadj.repository.*;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ReferenceService {

    private final EncadreurRepository encadreurs;
    private final SeasonRepository seasons;
    private final AppUserRepository users;
    private final SmtpSettingsRepository smtp;
    private final BordereauRepository bordereaux;
    private final PricingService pricing;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public ReferenceService(EncadreurRepository encadreurs, SeasonRepository seasons, AppUserRepository users,
                            SmtpSettingsRepository smtp, BordereauRepository bordereaux, PricingService pricing,
                            PasswordEncoder encoder, AuditService audit) {
        this.encadreurs = encadreurs;
        this.seasons = seasons;
        this.users = users;
        this.smtp = smtp;
        this.bordereaux = bordereaux;
        this.pricing = pricing;
        this.encoder = encoder;
        this.audit = audit;
    }

    // --- Encadreurs ---
    @Transactional(readOnly = true)
    public List<Encadreur> listEncadreurs(boolean onlyActive, String region) {
        return encadreurs.findAll().stream()
                .filter(e -> !onlyActive || e.isActive())
                .filter(e -> region == null || region.equals(e.getRegion()))
                .toList();
    }

    @Transactional
    public Encadreur createEncadreur(Map<String, Object> p, String actor) {
        Encadreur e = new Encadreur();
        e.setId(Ids.encadreurId(encadreurs.count() + 1));
        e.setName(str(p.get("name")));
        e.setRegion(str(p.get("region")));
        e.setCode(resolveCode(str(p.get("code")), null));
        e.setActive(p.get("active") == null || Boolean.TRUE.equals(p.get("active")));
        encadreurs.save(e);
        audit.log("CREATION_ENCADREUR", e.getId(), actor);
        return e;
    }

    @Transactional
    public Encadreur updateEncadreur(String id, Map<String, Object> updates, String actor) {
        Encadreur e = encadreurs.findById(id).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        if (updates.containsKey("name")) e.setName(str(updates.get("name")));
        if (updates.containsKey("region")) e.setRegion(str(updates.get("region")));
        if (updates.containsKey("code")) e.setCode(resolveCode(str(updates.get("code")), id));
        if (updates.containsKey("active")) e.setActive(Boolean.TRUE.equals(updates.get("active")));
        encadreurs.save(e);
        audit.log("MODIFICATION_ENCADREUR", id, actor);
        return e;
    }

    @Transactional
    public Map<String, Object> importEncadreurs(List<Map<String, Object>> rows, String actor) {
        List<Encadreur> created = new ArrayList<>();
        int index = 0;
        List<Map<String, Object>> errors = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            index++;
            String name = str(row.get("name"));
            if (name == null || name.isBlank()) {
                errors.add(Map.of("row", index, "reason", "MISSING_NAME"));
                continue;
            }
            created.add(createEncadreur(row, actor));
        }
        return Map.of("created", created, "errors", errors);
    }

    private String resolveCode(String rawCode, String excludeId) {
        if (rawCode != null && !rawCode.isBlank()) {
            String code = rawCode.trim().toUpperCase();
            encadreurs.findByCode(code).ifPresent(e -> {
                if (!e.getId().equals(excludeId)) throw new ApiException(409, "CODE_TAKEN");
            });
            return code;
        }
        String code;
        do {
            code = Ids.encadreurCode();
        } while (encadreurs.existsByCode(code));
        return code;
    }

    // --- Saisons ---
    @Transactional(readOnly = true)
    public List<Season> listSeasons() {
        return seasons.findAll();
    }

    @Transactional(readOnly = true)
    public long officialPrice(Integer season, String pilgrimType, boolean includesEncadreurFees) {
        return pricing.getPrice(season, pilgrimType, includesEncadreurFees);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Season createSeason(Map<String, Object> p, String actor) {
        Integer season = intVal(p.get("season"));
        if (seasons.existsById(season)) throw new ApiException(409, "SEASON_EXISTS");
        Season s = new Season();
        s.setSeason(season);
        s.setMonth(intVal(p.get("month")));
        s.setYear(intVal(p.getOrDefault("year", season)));
        s.setOpen(p.get("isOpen") == null || Boolean.TRUE.equals(p.get("isOpen")));
        s.setPrices(toLongMap((Map<String, Object>) p.get("prices")));
        s.setOfficialPriceExcludingCommission(longVal(p.get("officialPriceExcludingCommission")));
        s.setCommissionPerPilgrim(longVal(p.get("commissionPerPilgrim")));
        seasons.save(s);
        audit.log("CREATION_SAISON", String.valueOf(season), actor);
        return s;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Season updateSeason(Integer season, Map<String, Object> updates, String actor) {
        Season s = seasons.findById(season).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        if (updates.containsKey("isOpen")) s.setOpen(Boolean.TRUE.equals(updates.get("isOpen")));
        if (updates.containsKey("prices")) s.setPrices(toLongMap((Map<String, Object>) updates.get("prices")));
        if (updates.containsKey("officialPriceExcludingCommission")) s.setOfficialPriceExcludingCommission(longVal(updates.get("officialPriceExcludingCommission")));
        if (updates.containsKey("commissionPerPilgrim")) s.setCommissionPerPilgrim(longVal(updates.get("commissionPerPilgrim")));
        seasons.save(s);
        audit.log("MODIFICATION_SAISON", String.valueOf(season), actor);
        return s;
    }

    // --- Commissions encadreurs ---
    @Transactional(readOnly = true)
    public List<Map<String, Object>> commissions(Integer season) {
        Season s = pricing.getSeason(season);
        long officialPrice = s != null && s.getOfficialPriceExcludingCommission() != null
                ? s.getOfficialPriceExcludingCommission() : PricingService.DEFAULT_OFFICIAL_PRICE;
        long commissionPerPilgrim = s != null && s.getCommissionPerPilgrim() != null ? s.getCommissionPerPilgrim() : 0;
        Integer seasonYear = s != null ? s.getSeason() : null;

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Encadreur enc : encadreurs.findAll()) {
            List<Bordereau> list = bordereaux.findByEncadreurId(enc.getId()).stream()
                    .filter(b -> b.isIncludesEncadreurFees() && Objects.equals(b.getSeason(), seasonYear))
                    .toList();
            long totalPaid = list.stream().flatMap(b -> b.getVersements().stream())
                    .filter(v -> "VALIDE".equals(v.getStatus())).mapToLong(v -> v.getAmount() == null ? 0 : v.getAmount()).sum();
            long pilgrimsWithFees = list.stream().mapToLong(b -> b.getPilgrimCount() == null ? 1 : b.getPilgrimCount()).sum();
            long placesAcquired = officialPrice > 0 ? totalPaid / officialPrice : 0;
            long remainder = totalPaid - placesAcquired * officialPrice;
            long amountNeeded = remainder > 0 ? officialPrice - remainder : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("encadreurId", enc.getId());
            m.put("encadreurName", enc.getName());
            m.put("encadreurCode", enc.getCode());
            m.put("bordereauxCount", list.size());
            m.put("pilgrimsWithFees", pilgrimsWithFees);
            m.put("totalPaid", totalPaid);
            m.put("officialPrice", officialPrice);
            m.put("commissionPerPilgrim", commissionPerPilgrim);
            m.put("placesAcquired", placesAcquired);
            m.put("reliquat", remainder);
            m.put("amountNeededForNextPlace", amountNeeded);
            m.put("totalCommissionDue", pilgrimsWithFees * commissionPerPilgrim);
            rows.add(m);
        }
        return rows;
    }

    // --- Utilisateurs ---
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listUsers() {
        return users.findAll().stream().map(AuthService::safeUser).toList();
    }

    @Transactional
    public Map<String, Object> createUser(Map<String, Object> p, String actor) {
        String username = str(p.get("username"));
        if (users.existsByUsername(username)) throw new ApiException(409, "USERNAME_TAKEN");
        AppUser u = new AppUser();
        u.setId("U-" + (users.count() + 1));
        u.setUsername(username);
        u.setPassword(encoder.encode(p.get("password") == null ? Ids.pilgrimPassword() : str(p.get("password"))));
        u.setRole(str(p.get("role")));
        u.setName(str(p.get("name")));
        u.setEmail(str(p.get("email")));
        u.setAgency(str(p.get("agency")));
        u.setEncadreurId(str(p.get("encadreurId")));
        u.setActive(p.get("active") == null || Boolean.TRUE.equals(p.get("active")));
        users.save(u);
        audit.log("CREATION_UTILISATEUR", u.getId(), actor);
        return AuthService.safeUser(u);
    }

    @Transactional
    public Map<String, Object> updateUser(String id, Map<String, Object> updates, String actor) {
        AppUser u = users.findById(id).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        if (updates.containsKey("name")) u.setName(str(updates.get("name")));
        if (updates.containsKey("email")) u.setEmail(str(updates.get("email")));
        if (updates.containsKey("agency")) u.setAgency(str(updates.get("agency")));
        if (updates.containsKey("encadreurId")) u.setEncadreurId(str(updates.get("encadreurId")));
        if (updates.containsKey("active")) u.setActive(Boolean.TRUE.equals(updates.get("active")));
        if (updates.get("password") != null && !str(updates.get("password")).isBlank()) {
            u.setPassword(encoder.encode(str(updates.get("password"))));
        }
        users.save(u);
        audit.log("MODIFICATION_UTILISATEUR", id, actor);
        return AuthService.safeUser(u);
    }

    @Transactional
    public Map<String, Object> importUsers(List<Map<String, Object>> rows, String actor) {
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String username = str(row.get("username"));
            if (username == null || users.existsByUsername(username)) {
                skipped.add(Map.of("username", username == null ? "" : username));
                continue;
            }
            created.add(createUser(row, actor));
        }
        return Map.of("created", created, "skipped", skipped);
    }

    // --- SMTP ---
    @Transactional(readOnly = true)
    public SmtpSettings smtp() {
        return smtp.findById(1).orElseGet(() -> {
            SmtpSettings s = new SmtpSettings();
            s.setId(1);
            s.setFromName("Copilote Hadj");
            return smtp.save(s);
        });
    }

    @Transactional
    public SmtpSettings updateSmtp(Map<String, Object> p, String actor) {
        SmtpSettings s = smtp();
        if (p.containsKey("host")) s.setHost(str(p.get("host")));
        if (p.containsKey("port")) s.setPort(intVal(p.get("port")));
        if (p.containsKey("username")) s.setUsername(str(p.get("username")));
        if (p.containsKey("password")) s.setPassword(str(p.get("password")));
        if (p.containsKey("fromName")) s.setFromName(str(p.get("fromName")));
        if (p.containsKey("fromEmail")) s.setFromEmail(str(p.get("fromEmail")));
        if (p.containsKey("useTls")) s.setUseTls(Boolean.TRUE.equals(p.get("useTls")));
        if (p.containsKey("otpTtlMinutes")) s.setOtpTtlMinutes(intVal(p.get("otpTtlMinutes")));
        smtp.save(s);
        audit.log("MODIFICATION_SMTP", "smtp", actor);
        return s;
    }

    // --- Helpers ---
    private static Map<String, Long> toLongMap(Map<String, Object> src) {
        Map<String, Long> out = new HashMap<>();
        if (src != null) src.forEach((k, v) -> out.put(k, longVal(v)));
        return out;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    private static Integer intVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return (int) Double.parseDouble(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Long longVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try {
            return (long) Double.parseDouble(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
