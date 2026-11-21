function makeName({
  legalFirstName,
  birthFirstName,
  legalLastName,
  birthLastName,
  preferredName,
  nickname,
  email,
}) {
  const firstName = preferredName || legalFirstName || birthFirstName;
  const lastName = legalLastName || birthLastName;
  const nicknameText = nickname ? ` "${nickname}" ` : "";

  return firstName ? `${firstName} ${nicknameText} ${lastName}` : email;
}

export default makeName;
