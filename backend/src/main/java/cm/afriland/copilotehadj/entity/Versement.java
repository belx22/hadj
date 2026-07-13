package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "versement")
public class Versement {
    @Id
    private String id; // VER-...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bordereau_id")
    private Bordereau bordereau;

    private Long amount;
    private String method; // MOBILE_MONEY_ORANGE, MOBILE_MONEY_MTN, SARA, E_FIRST, VIREMENT, AGENCE, AUTRE
    private String reference;
    private String agency;

    @Column(columnDefinition = "text")
    private String receiptImage;

    @Column(columnDefinition = "text")
    private String qrData;

    private String otherDetails;
    private String accountNumber;

    private String status; // PENDING, VALIDE, REJETE
    private LocalDate createdAt;
    private LocalDate validatedAt;
    private String validatedBy;
    private String note;

    private String refundStatus; // null, A_REMBOURSER, REMBOURSE
    private LocalDate refundedAt;
    private String refundMethod;
    private String refundReference;

    private String groupPaymentId;
    private String payerIdNumber;
    private String payerName;
}
