import { googleApiRequest, listAllPages } from "./http.mjs";

const GTM_BASE_URL = "https://tagmanager.googleapis.com/tagmanager/v2";

function normalizeChildPath(value, prefix) {
  const trimmed = value.trim();
  return trimmed.startsWith(`${prefix}/`) ? trimmed : `${prefix}/${trimmed}`;
}

function accountPath(account) {
  return normalizeChildPath(account, "accounts");
}

function childSegment(value, prefix) {
  return normalizeChildPath(value, prefix).split("/").slice(-2).join("/");
}

function containerPath(account, container) {
  return `${accountPath(account)}/${childSegment(container, "containers")}`;
}

function workspacePath(account, container, workspace) {
  return `${containerPath(account, container)}/${childSegment(workspace, "workspaces")}`;
}

function versionPath(account, container, version) {
  return `${containerPath(account, container)}/${childSegment(version, "versions")}`;
}

function tagPath(account, container, workspace, tag) {
  return `${workspacePath(account, container, workspace)}/${childSegment(tag, "tags")}`;
}

function variablePath(account, container, workspace, variable) {
  return `${workspacePath(account, container, workspace)}/${childSegment(
    variable,
    "variables",
  )}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefined(entryValue)]),
    );
  }

  return value;
}

function writableTag(tag) {
  const next = deepClone(tag);
  delete next.path;
  delete next.tagManagerUrl;
  delete next.fingerprint;
  delete next.accountId;
  delete next.containerId;
  delete next.workspaceId;
  delete next.tagId;

  return removeUndefined(next);
}

function writableVariable(variable) {
  const next = deepClone(variable);
  delete next.path;
  delete next.tagManagerUrl;
  delete next.fingerprint;
  delete next.accountId;
  delete next.containerId;
  delete next.workspaceId;
  delete next.variableId;

  return removeUndefined(next);
}

function getTagParameter(tag, key) {
  return (tag.parameter || []).find((parameter) => parameter.key === key);
}

function setTemplateParameter(tag, key, value) {
  tag.parameter = tag.parameter || [];
  const existing = getTagParameter(tag, key);

  if (existing) {
    existing.type = "template";
    existing.value = value;
    delete existing.list;
    delete existing.map;
    return;
  }

  tag.parameter.push({
    type: "template",
    key,
    value,
  });
}

function setEventSettingsTable(tag, mappings) {
  tag.parameter = tag.parameter || [];
  const table = {
    type: "list",
    key: "eventSettingsTable",
    list: mappings.map((mapping) => ({
      type: "map",
      map: [
        {
          type: "template",
          key: "parameter",
          value: mapping.name,
        },
        {
          type: "template",
          key: "parameterValue",
          value: mapping.value,
        },
      ],
    })),
  };

  const existing = getTagParameter(tag, "eventSettingsTable");
  if (existing) {
    existing.type = "list";
    existing.list = table.list;
    delete existing.value;
    delete existing.map;
    return;
  }

  tag.parameter.push(table);
}

function updateMeasurementId(tag, measurementId) {
  const next = deepClone(tag);

  if (tag.type === "googtag") {
    setTemplateParameter(next, "tagId", measurementId);
  } else {
    setTemplateParameter(next, "measurementIdOverride", measurementId);
  }

  return next;
}

function createGa4EventTagTemplate(sourceTag, options) {
  const next = deepClone(sourceTag);
  next.name = options.name;
  next.type = "gaawe";
  next.firingTriggerId = [options.triggerId];
  next.paused = false;
  setTemplateParameter(next, "eventName", options.eventName);
  setTemplateParameter(next, "measurementIdOverride", options.measurementId);
  setEventSettingsTable(next, options.eventSettings);

  return next;
}

export async function listAccounts() {
  return listAllPages({
    url: `${GTM_BASE_URL}/accounts`,
    itemsKey: "account",
  });
}

export async function lookupContainerByTagId(tagId) {
  return googleApiRequest({
    url: `${GTM_BASE_URL}/accounts/containers:lookup`,
    params: { tagId },
  });
}

export async function listContainers(account) {
  return listAllPages({
    url: `${GTM_BASE_URL}/${accountPath(account)}/containers`,
    itemsKey: "container",
  });
}

export async function createContainer(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${accountPath(options.account)}/containers`,
    data: removeUndefined({
      name: options.name,
      usageContext: options.usageContext || ["web"],
      domainName: options.domainNames,
      notes: options.notes,
    }),
  });
}

export async function listUserPermissions(account) {
  return listAllPages({
    url: `${GTM_BASE_URL}/${accountPath(account)}/user_permissions`,
    itemsKey: "userPermission",
  });
}

export async function createUserPermission(options) {
  const containerAccess = options.containerId
    ? [
        {
          containerId: options.containerId,
          permission: options.containerPermission,
        },
      ]
    : [];

  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${accountPath(options.account)}/user_permissions`,
    data: {
      emailAddress: options.email,
      accountAccess: {
        permission: options.accountPermission,
      },
      containerAccess,
    },
  });
}

export async function listWorkspaces(account, container) {
  return listAllPages({
    url: `${GTM_BASE_URL}/${containerPath(account, container)}/workspaces`,
    itemsKey: "workspace",
  });
}

export async function getWorkspaceStatus(account, container, workspace) {
  return googleApiRequest({
    url: `${GTM_BASE_URL}/${workspacePath(account, container, workspace)}/status`,
  });
}

async function listWorkspaceChildren(resource, account, container, workspace, itemsKey) {
  return listAllPages({
    url: `${GTM_BASE_URL}/${workspacePath(account, container, workspace)}/${resource}`,
    itemsKey,
  });
}

export async function listTags(account, container, workspace) {
  return listWorkspaceChildren("tags", account, container, workspace, "tag");
}

export async function updateTag(options) {
  const tagId = options.tagId || options.tag?.tagId;
  if (!tagId) {
    throw new Error("updateTag requires a tagId.");
  }

  return googleApiRequest({
    method: "PUT",
    url: `${GTM_BASE_URL}/${tagPath(
      options.account,
      options.container,
      options.workspace,
      tagId,
    )}`,
    params: {
      fingerprint: options.fingerprint || options.tag?.fingerprint,
    },
    data: writableTag(options.tag),
  });
}

export async function createTag(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${workspacePath(
      options.account,
      options.container,
      options.workspace,
    )}/tags`,
    data: writableTag(options.tag),
  });
}

export async function listTriggers(account, container, workspace) {
  return listWorkspaceChildren("triggers", account, container, workspace, "trigger");
}

export async function listVariables(account, container, workspace) {
  return listWorkspaceChildren("variables", account, container, workspace, "variable");
}

export async function updateVariable(options) {
  const variableId = options.variableId || options.variable?.variableId;
  if (!variableId) {
    throw new Error("updateVariable requires a variableId.");
  }

  return googleApiRequest({
    method: "PUT",
    url: `${GTM_BASE_URL}/${variablePath(
      options.account,
      options.container,
      options.workspace,
      variableId,
    )}`,
    params: {
      fingerprint: options.fingerprint || options.variable?.fingerprint,
    },
    data: writableVariable(options.variable),
  });
}

export async function createVariable(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${workspacePath(
      options.account,
      options.container,
      options.workspace,
    )}/variables`,
    data: writableVariable(options.variable),
  });
}

export async function listGtagConfigs(account, container, workspace) {
  return listWorkspaceChildren(
    "gtag_config",
    account,
    container,
    workspace,
    "gtagConfig",
  );
}

export async function listVersionHeaders(account, container) {
  return listAllPages({
    url: `${GTM_BASE_URL}/${containerPath(account, container)}/version_headers`,
    itemsKey: "containerVersionHeader",
  });
}

export async function getLiveVersion(account, container) {
  return googleApiRequest({
    url: `${GTM_BASE_URL}/${containerPath(account, container)}/versions:live`,
  });
}

export async function createWorkspace(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${containerPath(options.account, options.container)}/workspaces`,
    data: {
      name: options.name,
      description: options.description,
    },
  });
}

export async function createVersion(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${workspacePath(
      options.account,
      options.container,
      options.workspace,
    )}:create_version`,
    data: {
      name: options.name,
      notes: options.notes,
    },
  });
}

export async function publishVersion(options) {
  return googleApiRequest({
    method: "POST",
    url: `${GTM_BASE_URL}/${versionPath(
      options.account,
      options.container,
      options.version,
    )}:publish`,
    params: {
      fingerprint: options.fingerprint,
    },
  });
}

export async function repairRoundReserveGa4(options) {
  const tags = await listTags(options.account, options.container, options.workspace);
  const triggers = await listTriggers(
    options.account,
    options.container,
    options.workspace,
  );
  const variables = await listVariables(
    options.account,
    options.container,
    options.workspace,
  );

  const actions = [];
  const updates = [];
  const variableUpdates = [];

  const desiredVariableNames = [
    "cta_location",
    "course_external_id",
    "conversion_type",
    "source",
    "plan",
    "test_user",
    "qa_cohort",
    "qa_persona",
    "qa_run_id",
    "app_env",
  ];

  const createDataLayerVariableDefinition = (name) => ({
    name,
    type: "v",
    parameter: [
      {
        type: "integer",
        key: "dataLayerVersion",
        value: "2",
      },
      {
        type: "boolean",
        key: "setDefaultValue",
        value: "false",
      },
      {
        type: "template",
        key: "name",
        value: name,
      },
    ],
  });

  for (const variableName of desiredVariableNames) {
    const existingVariable = variables.find((variable) => variable.name === variableName);
    const desiredVariable = createDataLayerVariableDefinition(variableName);

    if (!existingVariable) {
      actions.push({
        type: "createVariable",
        name: variableName,
      });

      if (!options.dryRun) {
        const created = await createVariable({
          account: options.account,
          container: options.container,
          workspace: options.workspace,
          variable: desiredVariable,
        });
        actions[actions.length - 1].variableId = created.variableId;
      }
      continue;
    }

    const changed =
      JSON.stringify(writableVariable(existingVariable)) !==
      JSON.stringify(writableVariable({ ...existingVariable, ...desiredVariable }));

    if (!changed) {
      continue;
    }

    variableUpdates.push({
      ...existingVariable,
      ...desiredVariable,
    });
    actions.push({
      type: "updateVariable",
      name: variableName,
      variableId: existingVariable.variableId,
    });
  }

  const eventSettingsByTagName = {
    "GA4 - Event - cta_start_free_trial": [
      { name: "cta_location", value: "{{cta_location}}" },
      { name: "course_external_id", value: "{{course_external_id}}" },
      { name: "test_user", value: "{{test_user}}" },
      { name: "qa_cohort", value: "{{qa_cohort}}" },
      { name: "qa_persona", value: "{{qa_persona}}" },
      { name: "qa_run_id", value: "{{qa_run_id}}" },
      { name: "app_env", value: "{{app_env}}" },
    ],
    "GA4 - Event - generate_lead": [
      { name: "course_external_id", value: "{{course_external_id}}" },
      { name: "conversion_type", value: "{{conversion_type}}" },
      { name: "source", value: "{{source}}" },
      { name: "test_user", value: "{{test_user}}" },
      { name: "qa_cohort", value: "{{qa_cohort}}" },
      { name: "qa_persona", value: "{{qa_persona}}" },
      { name: "qa_run_id", value: "{{qa_run_id}}" },
      { name: "app_env", value: "{{app_env}}" },
    ],
    "GA4 - Event - booking_setup_started": [
      { name: "cta_location", value: "{{cta_location}}" },
      { name: "course_external_id", value: "{{course_external_id}}" },
      { name: "test_user", value: "{{test_user}}" },
      { name: "qa_cohort", value: "{{qa_cohort}}" },
      { name: "qa_persona", value: "{{qa_persona}}" },
      { name: "qa_run_id", value: "{{qa_run_id}}" },
      { name: "app_env", value: "{{app_env}}" },
    ],
    "GA4 - Event - trial_checkout_started": [
      { name: "cta_location", value: "{{cta_location}}" },
      { name: "course_external_id", value: "{{course_external_id}}" },
      { name: "plan", value: "{{plan}}" },
      { name: "test_user", value: "{{test_user}}" },
      { name: "qa_cohort", value: "{{qa_cohort}}" },
      { name: "qa_persona", value: "{{qa_persona}}" },
      { name: "qa_run_id", value: "{{qa_run_id}}" },
      { name: "app_env", value: "{{app_env}}" },
    ],
  };

  for (const tag of tags) {
    if (tag.type !== "gaawe" && tag.type !== "googtag") {
      continue;
    }

    const nextTag = updateMeasurementId(tag, options.measurementId);

    if (tag.name === "GA4 - Pageview - SPA") {
      nextTag.paused = true;
    }

    const desiredEventSettings = eventSettingsByTagName[tag.name];
    if (desiredEventSettings) {
      setEventSettingsTable(nextTag, desiredEventSettings);
    }

    const changed =
      JSON.stringify(writableTag(nextTag)) !== JSON.stringify(writableTag(tag));
    if (!changed) {
      continue;
    }

    updates.push(nextTag);
    actions.push({
      type: "updateTag",
      name: tag.name,
      tagId: tag.tagId,
      paused: nextTag.paused ?? false,
      measurementId: options.measurementId,
    });
  }

  const trialTrigger = triggers.find(
    (trigger) => trigger.name === "Event - trial_checkout_started",
  );
  if (!trialTrigger) {
    throw new Error("Could not find GTM trigger named 'Event - trial_checkout_started'.");
  }

  const trialEventSettings =
    eventSettingsByTagName["GA4 - Event - trial_checkout_started"];
  const existingTrialTag = tags.find(
    (tag) => tag.name === "GA4 - Event - trial_checkout_started",
  );

  if (existingTrialTag) {
    // Existing trial tag updates are handled by the main tag reconciliation loop above.
  } else {
    const sourceEventTag =
      tags.find((tag) => tag.name === "GA4 - Event - cta_start_free_trial") ||
      tags.find((tag) => tag.type === "gaawe");
    if (!sourceEventTag) {
      throw new Error("Could not find a GA4 event tag to clone for trial checkout.");
    }

    const createdTag = createGa4EventTagTemplate(sourceEventTag, {
      name: "GA4 - Event - trial_checkout_started",
      eventName: "trial_checkout_started",
      triggerId: trialTrigger.triggerId,
      measurementId: options.measurementId,
      eventSettings: trialEventSettings,
    });

    actions.push({
      type: "createTag",
      name: createdTag.name,
      triggerId: trialTrigger.triggerId,
      measurementId: options.measurementId,
    });

    if (!options.dryRun) {
      const created = await createTag({
        account: options.account,
        container: options.container,
        workspace: options.workspace,
        tag: createdTag,
      });
      actions[actions.length - 1].tagId = created.tagId;
    }
  }

  if (!options.dryRun) {
    for (const variable of variableUpdates) {
      await updateVariable({
        account: options.account,
        container: options.container,
        workspace: options.workspace,
        variableId: variable.variableId,
        fingerprint: variable.fingerprint,
        variable,
      });
    }

    for (const tag of updates) {
      await updateTag({
        account: options.account,
        container: options.container,
        workspace: options.workspace,
        tagId: tag.tagId,
        fingerprint: tag.fingerprint,
        tag,
      });
    }
  }

  let versionResult;
  let publishResult;

  if (!options.dryRun && options.publish) {
    versionResult = await createVersion({
      account: options.account,
      container: options.container,
      workspace: options.workspace,
      name: options.versionName,
      notes: options.versionNotes,
    });

    publishResult = await publishVersion({
      account: options.account,
      container: options.container,
      version: versionResult.containerVersion.containerVersionId,
      fingerprint: versionResult.containerVersion.fingerprint,
    });
  }

  return {
    measurementId: options.measurementId,
    dryRun: Boolean(options.dryRun),
    actions,
    versionResult,
    publishResult,
  };
}
