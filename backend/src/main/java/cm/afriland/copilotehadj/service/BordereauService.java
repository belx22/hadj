package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.entity.StatusHistory;
import cm.afriland.copilotehadj.entity.Versement;
import cm.afriland.copilotehadj.repository.BordereauRepository;
import cm.afriland.copilotehadj.repository.EncadreurRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class BordereauService {

    private final BordereauRepository repo;
    private final BordereauMapper mapper;
    private final PricingService pricing;
    private final NotificationService notifications;
    private final AuditService audit;
    private final EncadreurRepository encadreurs;

    public BordereauService(BordereauRepository repo, BordereauMapper mapper, PricingService pricing,
                            NotificationService notifications, AuditService audit, EncadreurRepository encadreurs) {
        this.repo = repo;
        this.mapper = mapper;
        this.pricing = pricing;
        this.notifications = notifications;
        this.audit = audit;
        this.encadreurs = encadreurs;
    }

    private long nextSequence() {
        return repo.count() + 1;
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Map<String, String> filters) {
        List<Bordereau> items = repo.findAll();
        String region = blankToNull(filters.get("region"));
        String encadreurId = blankToNull(filters.get("encadreurId"));
        String agency = blankToNull(filters.get("agency"));
        String pilgrimType = blankToNull(filters.get("pilgrimType"));
        String season = blankToNull(filters.get("season"));
        String from = blankToNull(filters.get("from"));
        String to = blankToNull(filters.get("to"));

        return items.stream()
                .filter(b -> region == null || region.equals(b.getRegion()))
                .filter(b -> encadreurId == null || encadreurId.equals(b.getEncadreurId()))
                .filter(b -> agency == null || agency.equals(b.getAgency()))
                .filter(b -> pilgrimType == null || pilgrimType.equals(b.getPilgrimType()))
                .filter(b -> season == null || (b.getSeason() != null && b.getSeason().equals(Integer.valueOf(season))))
                .filter(b -> from == null || (b.getCreatedAt() != null && b.getCreatedAt().toString().compareTo(from) >= 0))
                .filter(b -> to == null || (b.getCreatedAt() != null && b.getCreatedAt().toString().compareTo(to) <= 0))
                .sorted(Comparator.comparing((Bordereau b) -> b.getCreatedAt() == null ? LocalDate.MIN : b.getCreatedAt()).reversed())
                .map(mapper::decorate)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean checkDuplicate(String idNumber, Integer season) {
        return repo.existsByIdNumberAndSeason(idNumber, season);
    }

    /**
     * Un passeport ne peut être inscrit qu'une fois par saison, et deux pèlerins
     * ne peuvent pas partager le même numéro de téléphone (celui-ci sert aussi
     * d'identifiant de connexion au dossier).
     */
    private void assertUniquePilgrim(String idNumber, String phone, Integer season) {
        if (repo.existsByIdNumberAndSeason(idNumber, season)) throw new ApiException(409, "DUPLICATE_PILGRIM");
        if (phone != null && !phone.isBlank() && repo.existsByPhoneAndSeason(phone, season)) {
            throw new ApiException(409, "DUPLICATE_PHONE");
        }
    }

    @Transactional
    public Map<String, Object> createByAgent(Map<String, Object> payload, String actor) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        assertUniquePilgrim(idNumber, str(payload.get("phone")), season);

        Bordereau b = base(payload);
        b.setSource("AGENT");
        b.setVisaStatus("EN_ATTENTE");
        long price = pricing.getPrice(season, b.getPilgrimType(), b.isIncludesEncadreurFees());
        long amount = (long) (b.getPilgrimCount() == null ? 1 : b.getPilgrimCount()) * price;

        Versement v = new Versement();
        v.setId(Ids.versementId());
        v.setAmount(amount);
        v.setMethod("AGENCE");
        v.setReference(b.getReceiptNumber());
        v.setAgency(b.getAgency());
        v.setStatus("VALIDE");
        v.setCreatedAt(LocalDate.now());
        v.setValidatedAt(LocalDate.now());
        v.setValidatedBy(actor);
        b.addVersement(v);

        b.addStatusHistory(history("EN_ATTENTE"));
        notifications.notifyPilgrim(b, "Copilote Hadj: votre souscription " + b.getId() + " a été enregistrée. Merci.");
        repo.save(b);
        audit.log("CREATION_BORDEREAU", b.getId(), actor);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> registerOnline(Map<String, Object> payload) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        assertUniquePilgrim(idNumber, str(payload.get("phone")), season);

        Bordereau b = base(payload);
        b.setSource("ONLINE");
        b.setOnlinePriority(true);
        b.setVisaStatus("EN_ATTENTE");
        b.addStatusHistory(history("EN_ATTENTE"));

        // Un encadreur ne peut pas se créer lui-même : sa fiche doit déjà exister au
        // référentiel (créée par l'agence). À l'auto-inscription en type Encadreur, on
        // le reconnaît par son n° de pièce d'identité et on rattache son dossier à sa
        // fiche (ce qui lui ouvre l'accès à son groupe). Sinon : direction l'agence.
        if ("ENCADREUR".equals(b.getPilgrimType())) {
            Encadreur enc = encadreurs.findByIdNumber(idNumber)
                    .orElseThrow(() -> new ApiException(404, "ENCADREUR_NOT_REGISTERED"));
            b.setEncadreurId(enc.getId());
        }

        notifications.notifyPilgrim(b, "Copilote Hadj: votre inscription en ligne " + b.getId() + " a été enregistrée.");
        repo.save(b);
        audit.log("INSCRIPTION_EN_LIGNE", b.getId(), idNumber);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> registerByEncadreur(Map<String, Object> payload, String encadreurId, String actor) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        if (season == null) season = defaultSeason();
        assertUniquePilgrim(idNumber, str(payload.get("phone")), season);

        payload.put("season", season);
        Bordereau b = base(payload);
        b.setEncadreurId(encadreurId);
        b.setSource("ENCADREUR");
        b.setVisaStatus("EN_ATTENTE");
        String password = Ids.pilgrimPassword();
        b.setPilgrimPassword(password);
        b.addStatusHistory(history("EN_ATTENTE"));
        notifications.notifyPilgrim(b, "Copilote Hadj: votre dossier " + b.getId() + " a été créé par votre encadreur.");
        repo.save(b);
        audit.log("INSCRIPTION_ENCADREUR", b.getId(), actor);

        Map<String, Object> res = mapper.decorate(b);
        res.put("password", password);
        return res;
    }

    @Transactional
    public Map<String, Object> importPilgrims(List<Map<String, Object>> rows, String encadreurId, String actor) {
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();
        int season = defaultSeason();
        // Déduplication intra-fichier, indépendante du flush en base : un même
        // passeport (ou téléphone) présent plusieurs fois dans le fichier n'est
        // importé qu'une seule fois. Clé passeport insensible à la casse/espaces.
        Set<String> seenIds = new HashSet<>();
        Set<String> seenPhones = new HashSet<>();

        int index = 0;
        for (Map<String, Object> row : rows) {
            index++;
            String idNumber = str(row.get("idNumber"));
            if (idNumber == null || idNumber.isBlank()) {
                errors.add(Map.of("row", index, "reason", "MISSING_ID"));
                continue;
            }
            if (repo.existsByIdNumberAndSeason(idNumber, season)) {
                skipped.add(Map.of("row", index, "idNumber", idNumber));
                continue;
            }
            if (!seenIds.add(idNumber.toUpperCase())) {
                skipped.add(Map.of("row", index, "idNumber", idNumber, "reason", "DUPLICATE_IN_FILE"));
                continue;
            }
            // Deux pèlerins ne peuvent pas partager le même numéro de téléphone.
            String phone = str(row.get("phone"));
            if (phone != null && !phone.isBlank()
                    && (repo.existsByPhoneAndSeason(phone, season) || !seenPhones.add(phone))) {
                skipped.add(Map.of("row", index, "idNumber", idNumber, "reason", "DUPLICATE_PHONE", "phone", phone));
                continue;
            }
            // Encadreur par ligne : la colonne « Encadreur » du fichier porte le CODE
            // de l'encadreur (un même fichier peut donc en mélanger plusieurs). À
            // défaut de code sur la ligne, on retombe sur l'encadreur passé en
            // paramètre (import depuis le portail encadreur, où il est fixe).
            String rowCode = str(row.get("encadreurCode"));
            String targetEncadreurId = encadreurId;
            if (rowCode != null && !rowCode.isBlank()) {
                Encadreur enc = encadreurs.findByCode(rowCode.toUpperCase()).orElse(null);
                if (enc == null) {
                    errors.add(Map.of("row", index, "idNumber", idNumber, "reason", "ENCADREUR_NOT_FOUND", "encadreur", rowCode));
                    continue;
                }
                targetEncadreurId = enc.getId();
            }
            if (targetEncadreurId == null || targetEncadreurId.isBlank()) {
                errors.add(Map.of("row", index, "idNumber", idNumber, "reason", "MISSING_ENCADREUR"));
                continue;
            }
            Map<String, Object> payload = new HashMap<>(row);
            payload.put("season", season);
            payload.putIfAbsent("pilgrimType", "PELERIN");
            payload.putIfAbsent("pilgrimStatus", "NOUVEAU");
            Bordereau b = base(payload);
            b.setEncadreurId(targetEncadreurId);
            b.setSource("ENCADREUR");
            b.setVisaStatus("EN_ATTENTE");
            String password = Ids.pilgrimPassword();
            b.setPilgrimPassword(password);
            b.addStatusHistory(history("EN_ATTENTE"));
            repo.save(b);
            created.add(Map.of("bordereauId", b.getId(), "pilgrimName",
                    b.getPilgrimFirstName() + " " + b.getPilgrimLastName(), "idNumber", idNumber,
                    "phone", b.getPhone() == null ? "" : b.getPhone(), "password", password));
        }
        if (!created.isEmpty()) audit.log("IMPORT_PELERINS_ENCADREUR", created.size() + " pèlerin(s)", actor);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("created", created);
        res.put("skipped", skipped);
        res.put("errors", errors);
        return res;
    }

    /**
     * Crée le dossier ENCADREUR propre à un encadreur (rattaché à lui-même) pour
     * qu'il puisse ouvrir son espace de gestion de groupe via passeport +
     * téléphone. Idempotent et sans effet de bord bloquant : ne crée rien si
     * l'encadreur n'a pas de n° de pièce, ou si un dossier existe déjà pour ce
     * passeport ou ce téléphone sur la saison courante. Renvoie true si un
     * dossier a été créé.
     */
    @Transactional
    public boolean createEncadreurSelfDossier(Encadreur e, String actor) {
        String idNumber = blankToNull(e.getIdNumber());
        if (idNumber == null) return false;
        int season = defaultSeason();
        if (repo.existsByIdNumberAndSeason(idNumber, season)) return false;
        String phone = blankToNull(e.getPhone());
        if (phone != null && repo.existsByPhoneAndSeason(phone, season)) return false;

        Map<String, Object> payload = new HashMap<>();
        payload.put("pilgrimLastName", e.getLastName());
        payload.put("pilgrimFirstName", e.getFirstName());
        payload.put("phone", phone);
        payload.put("idNumber", idNumber);
        payload.put("region", e.getRegion());
        payload.put("pilgrimType", "ENCADREUR");
        payload.put("pilgrimStatus", "NOUVEAU");
        payload.put("season", season);

        Bordereau b = base(payload);
        b.setEncadreurId(e.getId());
        b.setSource("ENCADREUR");
        b.setVisaStatus("EN_ATTENTE");
        b.addStatusHistory(history("EN_ATTENTE"));
        repo.save(b);
        audit.log("CREATION_DOSSIER_ENCADREUR", b.getId(), actor);
        return true;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> pilgrimLogin(String idNumber, String secret) {
        Bordereau b = repo.findFirstByIdNumber(idNumber).orElse(null);
        if (b == null) throw new ApiException(404, "NOT_FOUND");
        boolean ok = secret != null && (secret.equals(b.getPhone()) || secret.equals(b.getPilgrimPassword()));
        if (!ok) throw new ApiException(401, "INVALID_CREDENTIALS");
        return mapper.decorate(b);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> encadreurGroup(String encadreurId) {
        return repo.findByEncadreurId(encadreurId).stream().map(mapper::decorate).toList();
    }

    // --- Helpers ---
    private Bordereau base(Map<String, Object> p) {
        Bordereau b = new Bordereau();
        long seq = nextSequence();
        b.setId(Ids.bordereauId(seq));
        b.setReceiptNumber(Ids.receiptNumber(seq));
        b.setReference(str(p.get("reference")));
        b.setPilgrimLastName(str(p.get("pilgrimLastName")));
        b.setPilgrimFirstName(str(p.get("pilgrimFirstName")));
        b.setPhone(str(p.get("phone")));
        b.setIdNumber(str(p.get("idNumber")));
        b.setEmail(str(p.get("email")));
        b.setRegion(str(p.get("region")));
        b.setAgency(str(p.get("agency")));
        if (p.get("encadreurId") != null) b.setEncadreurId(str(p.get("encadreurId")));
        b.setPilgrimType(p.get("pilgrimType") == null ? "PELERIN" : str(p.get("pilgrimType")));
        b.setPilgrimStatus(p.get("pilgrimStatus") == null ? "NOUVEAU" : str(p.get("pilgrimStatus")));
        b.setGender(normalizeGender(p.get("gender")));
        b.setIncludesEncadreurFees(Boolean.TRUE.equals(p.get("includesEncadreurFees")));
        // Défaut true : seul un encadreur qui décoche explicitement sort son
        // dossier du total du groupe.
        b.setIncludeInGroupTotal(!Boolean.FALSE.equals(p.get("includeInGroupTotal")));
        b.setPilgrimCount(p.get("pilgrimCount") == null ? 1 : intVal(p.get("pilgrimCount")));
        b.setSeason(p.get("season") == null ? defaultSeason() : intVal(p.get("season")));
        b.setOnlinePriority(Boolean.TRUE.equals(p.get("onlinePriority")));
        b.setCreatedAt(LocalDate.now());
        return b;
    }

    private StatusHistory history(String status) {
        StatusHistory h = new StatusHistory();
        h.setStatus(status);
        h.setDate(LocalDate.now().toString());
        return h;
    }

    private int defaultSeason() {
        var s = pricing.getSeason(null);
        return s != null && s.getSeason() != null ? s.getSeason() : 2027;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    // Normalise le sexe vers "M"/"F". Tolérant : M/Masculin/Male et H/Homme -> M ;
    // F/Femme/Féminin/Female -> F. Toute autre valeur (ou vide) -> null.
    private static String normalizeGender(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        char c = Character.toUpperCase(s.charAt(0));
        if (c == 'F') return "F";
        if (c == 'M' || c == 'H') return "M";
        return null;
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
}
