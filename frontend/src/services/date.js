export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function getCountdownLabel(value) {
  if (!value) {
    return "TBA";
  }

  const now = Date.now();
  const target = new Date(value).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return "Live now";
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  const minutes = Math.floor((difference / (1000 * 60)) % 60);
  return `${hours}h ${minutes}m left`;
}

export function toDateTimeInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toIsoString(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

