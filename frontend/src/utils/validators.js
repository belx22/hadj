export const isValidPhone = (phone) => /^\d{9}$/.test(String(phone || '').trim());

export const isValidIdNumber = (id) => String(id || '').trim().length >= 4;

export function validateBordereau(values, t, { requireAgency = true, requireEmail = false } = {}) {
  const errors = {};

  if (!values.pilgrimLastName?.trim()) errors.pilgrimLastName = t('bordereau.errors.genericRequired');
  if (!values.pilgrimFirstName?.trim()) errors.pilgrimFirstName = t('bordereau.errors.genericRequired');

  if (!values.phone?.trim()) {
    errors.phone = t('bordereau.errors.phoneRequired');
  } else if (!isValidPhone(values.phone)) {
    errors.phone = t('bordereau.errors.phoneInvalid');
  }

  if (requireEmail && !values.email?.trim()) {
    errors.email = t('bordereau.errors.genericRequired');
  }

  if (!values.idNumber?.trim()) {
    errors.idNumber = t('bordereau.errors.idRequired');
  }

  if (!values.encadreurId) {
    errors.encadreurId = t('bordereau.errors.encadreurRequired');
  }

  if (!values.region) errors.region = t('bordereau.errors.genericRequired');
  if (requireAgency && !values.agency) errors.agency = t('bordereau.errors.genericRequired');
  if (!values.pilgrimCount || Number(values.pilgrimCount) < 1) {
    errors.pilgrimCount = t('bordereau.errors.genericRequired');
  }

  return errors;
}
