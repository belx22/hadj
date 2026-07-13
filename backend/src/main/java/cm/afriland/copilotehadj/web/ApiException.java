package cm.afriland.copilotehadj.web;

/** Exception métier portant un code HTTP et un code d'erreur applicatif. */
public class ApiException extends RuntimeException {
    private final int status;
    private final String code;

    public ApiException(int status, String code) {
        super(code);
        this.status = status;
        this.code = code;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
