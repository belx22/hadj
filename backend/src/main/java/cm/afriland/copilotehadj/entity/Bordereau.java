package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "bordereau", indexes = {
        @Index(name = "idx_bordereau_idnumber", columnList = "idNumber"),
        @Index(name = "idx_bordereau_season", columnList = "season"),
        @Index(name = "idx_bordereau_encadreur", columnList = "encadreurId")
})
public class Bordereau {
    @Id
    private String id; // BOR-0001

    private String reference;
    private String source; // AGENT, ONLINE, ENCADREUR

    private String pilgrimLastName;
    private String pilgrimFirstName;
    private String phone;
    private String idNumber;
    private String email;
    private String region;
    private String agency;
    private String encadreurId;

    private String pilgrimType;   // PELERIN, ENCADREUR, OFFICIEL, GUH
    private String pilgrimStatus; // NOUVEAU, RECURRENT
    private boolean includesEncadreurFees;
    // Dossier propre d'un encadreur : intègre (ou non) son montant dans le total
    // à collecter de son groupe. Sans effet pour un pèlerin ordinaire.
    // @ColumnDefault : sans valeur par défaut, l'ajout de cette colonne NOT NULL
    // par ddl-auto=update échoue sur une table déjà peuplée (Postgres refuse
    // « ADD COLUMN ... NOT NULL » sans défaut), la colonne n'est jamais créée et
    // toute lecture de bordereau tombe alors en 500.
    @ColumnDefault("true")
    private boolean includeInGroupTotal = true;
    private Integer pilgrimCount = 1;
    private Integer season;
    private String receiptNumber;
    private boolean onlinePriority;
    private LocalDate createdAt;

    private String visaStatus; // EN_ATTENTE, EN_COURS, ACCORDE, REFUSE, COMPLEMENT_REQUIS

    // Mot de passe en clair transmis au pèlerin (inscription par encadreur) —
    // sert d'identifiant de suivi à distance. Non exposé dans les listes.
    private String pilgrimPassword;

    private boolean passportDeposited;
    private LocalDate passportDepositedAt;

    @OneToMany(mappedBy = "bordereau", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Versement> versements = new ArrayList<>();

    @OneToMany(mappedBy = "bordereau", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Notification> notifications = new ArrayList<>();

    @OneToMany(mappedBy = "bordereau", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<StatusHistory> statusHistory = new ArrayList<>();

    public void addVersement(Versement v) {
        v.setBordereau(this);
        versements.add(v);
    }

    public void addNotification(Notification n) {
        n.setBordereau(this);
        notifications.add(n);
    }

    public void addStatusHistory(StatusHistory s) {
        s.setBordereau(this);
        statusHistory.add(s);
    }
}
