import { googleApiRequest, listAllPages } from "./http.mjs";

const ANALYTICS_ADMIN_V1ALPHA = "https://analyticsadmin.googleapis.com/v1alpha";
const ANALYTICS_ADMIN_V1BETA = "https://analyticsadmin.googleapis.com/v1beta";
const ANALYTICS_DATA_V1BETA = "https://analyticsdata.googleapis.com/v1beta";

function normalizeChildPath(value, prefix) {
  const trimmed = value.trim();
  return trimmed.startsWith(`${prefix}/`) ? trimmed : `${prefix}/${trimmed}`;
}

function childSegment(value, prefix) {
  return normalizeChildPath(value, prefix).split("/").slice(-2).join("/");
}

function accountPath(account) {
  return normalizeChildPath(account, "accounts");
}

function propertyPath(property) {
  return normalizeChildPath(property, "properties");
}

function dataStreamPath(property, dataStream) {
  return `${propertyPath(property)}/${childSegment(dataStream, "dataStreams")}`;
}

function resolveAccessParent(parentType, parent) {
  if (parentType === "account") {
    return accountPath(parent);
  }

  if (parentType === "property") {
    return propertyPath(parent);
  }

  throw new Error(`Unsupported parent type: ${parentType}. Use account or property.`);
}

export async function listAccounts() {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1ALPHA}/accounts`,
    itemsKey: "accounts",
  });
}

export async function listAccountSummaries() {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1ALPHA}/accountSummaries`,
    itemsKey: "accountSummaries",
  });
}

export async function listProperties(account) {
  if (!account) {
    const summaries = await listAccountSummaries();
    return summaries.flatMap((summary) => summary.propertySummaries || []);
  }

  const options = {
    url: `${ANALYTICS_ADMIN_V1ALPHA}/properties`,
    itemsKey: "properties",
  };

  options.params = {
    filter: `parent:${accountPath(account)}`,
  };

  return listAllPages(options);
}

export async function createProperty(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_ADMIN_V1ALPHA}/properties`,
    data: {
      displayName: options.displayName,
      timeZone: options.timeZone || "America/New_York",
      currencyCode: options.currencyCode || "USD",
      parent: accountPath(options.account),
    },
  });
}

export async function listDataStreams(property) {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${propertyPath(property)}/dataStreams`,
    itemsKey: "dataStreams",
  });
}

export async function createWebDataStream(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${propertyPath(options.property)}/dataStreams`,
    data: {
      type: "WEB_DATA_STREAM",
      displayName: options.displayName,
      webStreamData: {
        defaultUri: options.defaultUri,
      },
    },
  });
}

export async function listMeasurementProtocolSecrets(property, dataStream) {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${dataStreamPath(
      property,
      dataStream,
    )}/measurementProtocolSecrets`,
    itemsKey: "measurementProtocolSecrets",
  });
}

export async function listKeyEvents(property) {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1BETA}/${propertyPath(property)}/keyEvents`,
    itemsKey: "keyEvents",
  });
}

export async function createKeyEvent(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_ADMIN_V1BETA}/${propertyPath(options.property)}/keyEvents`,
    data: {
      eventName: options.eventName,
      countingMethod: options.countingMethod || "ONCE_PER_EVENT",
    },
  });
}

export async function ensureKeyEvent(options) {
  const keyEvents = await listKeyEvents(options.property);
  const existing = keyEvents.find((keyEvent) => keyEvent.eventName === options.eventName);

  if (existing) {
    return {
      status: "existing",
      keyEvent: existing,
    };
  }

  const created = await createKeyEvent(options);
  return {
    status: "created",
    keyEvent: created,
  };
}

export async function listAccessBindings(options) {
  return listAllPages({
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${resolveAccessParent(
      options.parentType,
      options.parent,
    )}/accessBindings`,
    itemsKey: "accessBindings",
    params: {
      pageSize: options.pageSize || 200,
    },
  });
}

export async function createAccessBinding(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${resolveAccessParent(
      options.parentType,
      options.parent,
    )}/accessBindings`,
    data: {
      user: options.user,
      roles: options.roles,
    },
  });
}

export async function updateAccessBinding(options) {
  return googleApiRequest({
    method: "PATCH",
    url: `${ANALYTICS_ADMIN_V1ALPHA}/${options.name}`,
    params: {
      updateMask: "roles",
    },
    data: {
      name: options.name,
      user: options.user,
      roles: options.roles,
    },
  });
}

export async function ensureAccessBinding(options) {
  const accessBindings = await listAccessBindings(options);
  const normalizedUser = options.user.trim().toLowerCase();
  const existing = accessBindings.find(
    (binding) => typeof binding.user === "string" && binding.user.toLowerCase() === normalizedUser,
  );
  const normalizedRoles = [...new Set(options.roles)].sort();

  if (!existing) {
    const created = await createAccessBinding(options);
    return {
      status: "created",
      accessBinding: created,
    };
  }

  const currentRoles = [...new Set(existing.roles || [])].sort();
  const needsUpdate =
    currentRoles.length !== normalizedRoles.length ||
    currentRoles.some((role, index) => role !== normalizedRoles[index]);

  if (!needsUpdate) {
    return {
      status: "existing",
      accessBinding: existing,
    };
  }

  const updated = await updateAccessBinding({
    name: existing.name,
    user: existing.user,
    roles: normalizedRoles,
  });
  return {
    status: "updated",
    accessBinding: updated,
  };
}

export async function runReport(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_DATA_V1BETA}/${propertyPath(options.property)}:runReport`,
    data: {
      dateRanges: [
        {
          startDate: `${options.days ?? 7}daysAgo`,
          endDate: "today",
        },
      ],
      dimensions: (options.dimensions || ["eventName"]).map((name) => ({ name })),
      metrics: (options.metrics || ["eventCount"]).map((name) => ({ name })),
      limit: options.limit ?? 50,
    },
  });
}

export async function runRealtimeReport(options) {
  return googleApiRequest({
    method: "POST",
    url: `${ANALYTICS_DATA_V1BETA}/${propertyPath(options.property)}:runRealtimeReport`,
    data: {
      dimensions: (options.dimensions || ["eventName"]).map((name) => ({ name })),
      metrics: (options.metrics || ["eventCount"]).map((name) => ({ name })),
      limit: options.limit ?? 50,
    },
  });
}
