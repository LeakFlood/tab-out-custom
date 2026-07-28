(function setupTabOutTodoWidget(globalObject) {
  const service = globalObject.TabOutTodoService;

  if (!service) {
    return;
  }

  const iconMarkup = Object.freeze({
    edit: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931ZM19.5 7.125 16.875 4.5M18 13.5V19.125A1.875 1.875 0 0 1 16.125 21H4.875A1.875 1.875 0 0 1 3 19.125V7.875A1.875 1.875 0 0 1 4.875 6H10.5" /></svg>',
    archive: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.246 2.118H6.621a2.25 2.25 0 0 1-2.246-2.118L3.75 7.5m6 4.125h4.5m-10.5-7.5h16.5c.621 0 1.125.504 1.125 1.125v1.125c0 .621-.504 1.125-1.125 1.125H3.75a1.125 1.125 0 0 1-1.125-1.125V5.25c0-.621.504-1.125 1.125-1.125Z" /></svg>',
    restore: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83L3.75 8.59m0-4.84v4.84h4.84" /></svg>',
    delete: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.5h15m-10.5 0V4.75h6V7.5m-8.25 0 .75 12h9l.75-12M10 11v5m4-5v5" /></svg>',
    expand: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6.75 9 5.25 5.25L17.25 9" /></svg>',
    email: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.51 5.315a2.25 2.25 0 0 1-2.48 0L2.25 6.75" /></svg>',
    emailView: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 5.25h15A2.25 2.25 0 0 1 21.75 7.5v9A2.25 2.25 0 0 1 19.5 18.75h-15A2.25 2.25 0 0 1 2.25 16.5v-9A2.25 2.25 0 0 1 4.5 5.25Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 5.25v13.5m4.5-8.25h5.25m-5.25 3h5.25"/></svg>',
    drag: '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.35"/><circle cx="16" cy="6" r="1.35"/><circle cx="8" cy="12" r="1.35"/><circle cx="16" cy="12" r="1.35"/><circle cx="8" cy="18" r="1.35"/><circle cx="16" cy="18" r="1.35"/></svg>',
    palette: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75a8.25 8.25 0 1 0 0 16.5h1.125a1.875 1.875 0 0 0 0-3.75H12a1.5 1.5 0 0 1 0-3h2.625A5.625 5.625 0 0 0 20.25 7.875 4.125 4.125 0 0 0 16.125 3.75H12Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 9h.008v.008H7.5V9Zm2.25-2.25h.008v.008H9.75V6.75Zm3.375-.375h.008v.008h-.008v-.008Zm3 1.5h.008v.008h-.008v-.008Z"/></svg>'
  });

  const taskAppearanceIconMarkup = Object.freeze({
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 6V4.75h6V6M4 8h16v10.25A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V8Z"/><path d="M4 12h16M10 12v2h4v-2"/></svg>',
    personal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7.2 3.8 4.8 5.4c-.9.6-1.2 1.8-.7 2.8 2.5 5.1 6.6 9.2 11.7 11.7 1 .5 2.2.2 2.8-.7l1.6-2.4-4.4-3-1.8 1.8a14.2 14.2 0 0 1-5.6-5.6l1.8-1.8-3-4.4Z"/></svg>',
    shopping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10.3 4.2 2.7 17.4A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.6L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>'
  });

  const TASK_APPEARANCE_COLORS = Object.freeze([
    { value: "#ef4444", labelKey: "todoTaskColorRed" },
    { value: "#f97316", labelKey: "todoTaskColorOrange" },
    { value: "#eab308", labelKey: "todoTaskColorYellow" },
    { value: "#22c55e", labelKey: "todoTaskColorGreen" },
    { value: "#3b82f6", labelKey: "todoTaskColorBlue" },
    { value: "#8b5cf6", labelKey: "todoTaskColorPurple" },
    { value: "#ec4899", labelKey: "todoTaskColorPink" },
    { value: "#64748b", labelKey: "todoTaskColorSlate" }
  ]);

  const expandedTaskIds = new Set();
  let snapshot = {
    state: { tasks: [] },
    undoCount: 0,
    latestUndoLabel: ""
  };
  let composerChecklist = [];
  let editingTaskId = "";
  let archiveExpanded = false;
  let busy = false;
  let refreshPromise = null;
  let taskDragState = null;
  const TASK_DRAG_THRESHOLD = 7;

  function translate(key, variables = {}) {
    return typeof globalObject.t === "function"
      ? globalObject.t(key, variables)
      : key;
  }

  function createTemporaryId() {
    return typeof globalObject.crypto?.randomUUID === "function"
      ? `todo-item-${globalObject.crypto.randomUUID()}`
      : `todo-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getTodoSettings() {
    return (
      globalObject.TabOutDashboardRuntime?.getEffectiveSettings?.().todo ||
      globalObject.TabOutDashboardSettings?.DEFAULT_TODO_SETTINGS || {
        completionAction: "archive",
        deadlineColorsEnabled: true,
        dueSoonDays: 3,
        colors: {},
        emailTaskIntegrationEnabled: true,
        emailCompletionAction: "keep"
      }
    );
  }

  function sendGmailMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false });
          return;
        }

        resolve(response || { ok: false });
      });
    });
  }

  function getTaskById(taskId) {
    return snapshot.state.tasks.find((task) => task.id === taskId) || null;
  }

  function resolveGmailAccountId(source) {
    const matchingAccount =
      globalObject.TabOutGmailWidget
        ?.getCachedState?.()
        ?.accounts?.find(
          (account) =>
            String(account.email || "").toLowerCase() ===
            String(source?.accountEmail || "").toLowerCase()
        );

    return matchingAccount?.accountId || source?.accountId || "";
  }

  function formatDate(value, includeTime = false) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      document.documentElement.lang || "fr",
      includeTime
        ? {
            dateStyle: "medium",
            timeStyle: "short"
          }
        : { dateStyle: "medium" }
    ).format(date);
  }

  function deadlineToDate(deadline) {
    if (!deadline?.date) {
      return null;
    }

    const [year, month, day] = deadline.date.split("-").map(Number);
    const [hour, minute] = deadline.time
      ? deadline.time.split(":").map(Number)
      : [23, 59];
    const date = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      deadline.time ? 0 : 59,
      deadline.time ? 0 : 999
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getDeadlineUrgency(deadline) {
    const dueAt = deadlineToDate(deadline);

    if (!dueAt) {
      return null;
    }

    const now = new Date();

    if (now.getTime() > dueAt.getTime()) {
      return "overdue";
    }

    if (
      now.getFullYear() === dueAt.getFullYear() &&
      now.getMonth() === dueAt.getMonth() &&
      now.getDate() === dueAt.getDate()
    ) {
      return "today";
    }

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dueStart = new Date(
      dueAt.getFullYear(),
      dueAt.getMonth(),
      dueAt.getDate()
    );
    const daysUntil = Math.round(
      (dueStart.getTime() - todayStart.getTime()) / 86400000
    );

    return daysUntil <= getTodoSettings().dueSoonDays ? "soon" : "future";
  }

  function formatDeadline(deadline) {
    const date = deadlineToDate(deadline);

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(
      document.documentElement.lang || "fr",
      deadline.time
        ? {
            dateStyle: "medium",
            timeStyle: "short"
          }
        : { dateStyle: "medium" }
    ).format(date);
  }

  function getActiveTasksInOrder(tasks) {
    return [...tasks];
  }

  function createTaskDragHandle(taskId) {
    const button = document.createElement("button");
    const label = translate("todoReorderTask");
    button.type = "button";
    button.className = "todo-task-drag-handle";
    button.dataset.todoDragHandle = "true";
    button.dataset.todoTaskId = taskId;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = iconMarkup.drag;
    return button;
  }

  function getTaskIconLabel(iconId) {
    return translate(
      `todoTaskIcon${iconId[0].toUpperCase()}${iconId.slice(1)}`
    );
  }

  function createTaskAppearanceIcon(task) {
    const iconId = task.appearance?.icon;
    const markup = taskAppearanceIconMarkup[iconId];

    if (!markup) {
      return null;
    }

    const icon = document.createElement("span");
    icon.className = "todo-task-appearance-icon";
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", getTaskIconLabel(iconId));
    icon.innerHTML = markup;
    return icon;
  }

  function applyTaskAppearance(element, task) {
    const color = task.appearance?.color;

    element.classList.toggle("has-task-accent", Boolean(color));

    if (color) {
      element.style.setProperty("--todo-task-accent", color);
    } else {
      element.style.removeProperty("--todo-task-accent");
    }
  }

  function createIconButton(action, label, icon, taskId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "todo-task-icon-btn";
    button.dataset.todoAction = action;
    button.dataset.todoTaskId = taskId;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = iconMarkup[icon];
    return button;
  }

  function createDeadlineBadge(task) {
    if (!task.deadline) {
      return null;
    }

    const settings = getTodoSettings();
    const urgency = getDeadlineUrgency(task.deadline);
    const badge = document.createElement("span");
    const urgencyLabel = translate(`todoDeadline${urgency[0].toUpperCase()}${urgency.slice(1)}`);
    badge.className = "todo-deadline-badge";
    badge.dataset.urgency = urgency;
    badge.textContent = `${urgencyLabel} · ${formatDeadline(task.deadline)}`;

    if (settings.deadlineColorsEnabled) {
      badge.style.setProperty(
        "--todo-priority-color",
        settings.colors[urgency]
      );
      badge.classList.add("has-priority-color");
    }

    return badge;
  }

  function createChecklistDisplay(task) {
    const list = document.createElement("div");
    list.className = "todo-task-checklist";

    task.checklist.forEach((item) => {
      const label = document.createElement("label");
      label.className = "todo-task-checklist-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.completed;
      checkbox.dataset.todoAction = "toggle-checklist";
      checkbox.dataset.todoTaskId = task.id;
      checkbox.dataset.todoChecklistId = item.id;
      const text = document.createElement("span");
      text.textContent = item.text;
      label.append(checkbox, text);
      list.appendChild(label);
    });

    return list;
  }

  function createEmailSourceCard(task) {
    const source = task.source;
    const sourceCard = document.createElement("div");
    sourceCard.className = "todo-email-source";
    const mark = document.createElement("span");
    mark.className = "todo-email-source-mark";
    mark.innerHTML = iconMarkup.email;
    const copy = document.createElement("div");
    copy.className = "todo-email-source-copy";
    const label = document.createElement("span");
    label.className = "todo-email-source-label";
    label.textContent = translate("todoEmailTaskSourceLabel");
    const subject = document.createElement("strong");
    subject.className = "todo-email-source-subject";
    subject.textContent =
      source.subject || task.title || translate("gmailNoSubject");
    const identity = document.createElement("span");
    identity.className = "todo-email-source-identity";
    identity.textContent =
      source.senderName &&
      source.senderEmail &&
      source.senderName !== source.senderEmail
        ? `${source.senderName} · ${source.senderEmail}`
        : source.senderName || source.senderEmail || "Gmail";
    const account = document.createElement("span");
    account.className = "todo-email-source-account";
    account.textContent = source.accountEmail;
    copy.append(label, subject, identity, account);
    const actions = document.createElement("div");
    actions.className = "todo-email-source-actions";
    const show = document.createElement("button");
    show.type = "button";
    show.className = "todo-email-source-open is-primary";
    show.dataset.todoAction = "show-email-task";
    show.dataset.todoTaskId = task.id;
    show.textContent = translate("todoEmailTaskShow");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "todo-email-source-open";
    open.dataset.todoAction = "open-email-task";
    open.dataset.todoTaskId = task.id;
    open.textContent = translate("todoEmailTaskOpenExternal");
    actions.append(show, open);
    sourceCard.append(mark, copy, actions);
    return sourceCard;
  }

  function appendEditorChecklistRow(container, item) {
    const row = document.createElement("div");
    row.className = "todo-editor-checklist-row";
    row.dataset.todoChecklistId = item.id || createTemporaryId();
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.completed === true;
    checkbox.className = "todo-editor-checklist-completed";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 300;
    input.value = item.text || "";
    input.className = "todo-editor-checklist-text";
    input.setAttribute("aria-label", translate("todoChecklistItemLabel"));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.todoAction = "remove-edit-checklist";
    remove.title = translate("todoRemoveChecklistItem");
    remove.setAttribute("aria-label", translate("todoRemoveChecklistItem"));
    remove.textContent = "×";
    row.append(checkbox, input, remove);
    container.appendChild(row);
  }

  function updateTaskAppearanceEditor(form) {
    const selectedColor = form.dataset.todoAppearanceColor || "";
    const selectedIcon = form.dataset.todoAppearanceIcon || "";
    const presetColors = new Set(
      TASK_APPEARANCE_COLORS.map((option) => option.value)
    );

    form
      .querySelectorAll("[data-todo-appearance-color]")
      .forEach((button) => {
        const selected =
          button.dataset.todoAppearanceColor === selectedColor;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    const customColor = form.querySelector(
      "[data-todo-custom-color]"
    );
    const customWrapper = customColor?.closest(
      ".todo-appearance-custom-color"
    );
    const customSelected =
      Boolean(selectedColor) && !presetColors.has(selectedColor);
    customWrapper?.classList.toggle("is-selected", customSelected);

    form
      .querySelectorAll("[data-todo-appearance-icon]")
      .forEach((button) => {
        const selected =
          button.dataset.todoAppearanceIcon === selectedIcon;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  function createTaskAppearanceEditor(task, form) {
    const appearance = task.appearance || {
      color: null,
      icon: null
    };
    form.dataset.todoAppearanceColor = appearance.color || "";
    form.dataset.todoAppearanceIcon = appearance.icon || "";
    const section = document.createElement("section");
    section.className = "todo-appearance-editor";
    const header = document.createElement("div");
    header.className = "todo-appearance-heading";
    const mark = document.createElement("span");
    mark.className = "todo-appearance-mark";
    mark.innerHTML = iconMarkup.palette;
    const headingCopy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = translate("todoTaskAppearanceTitle");
    const hint = document.createElement("span");
    hint.textContent = translate("todoTaskAppearanceHint");
    headingCopy.append(title, hint);
    header.append(mark, headingCopy);

    const colorGroup = document.createElement("div");
    colorGroup.className = "todo-appearance-group";
    const colorLabel = document.createElement("span");
    colorLabel.className = "todo-appearance-label";
    colorLabel.textContent = translate("todoTaskColorLabel");
    const colors = document.createElement("div");
    colors.className = "todo-appearance-options is-colors";
    const noColor = document.createElement("button");
    noColor.type = "button";
    noColor.className =
      "todo-appearance-choice todo-appearance-no-color";
    noColor.dataset.todoAction = "select-edit-color";
    noColor.dataset.todoAppearanceColor = "";
    noColor.textContent = "×";
    noColor.title = translate("todoTaskColorNone");
    noColor.setAttribute("aria-label", noColor.title);
    colors.appendChild(noColor);
    TASK_APPEARANCE_COLORS.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "todo-appearance-choice todo-appearance-color";
      button.dataset.todoAction = "select-edit-color";
      button.dataset.todoAppearanceColor = option.value;
      button.style.setProperty("--todo-choice-color", option.value);
      button.title = translate(option.labelKey);
      button.setAttribute("aria-label", button.title);
      colors.appendChild(button);
    });
    const customColor = document.createElement("label");
    customColor.className = "todo-appearance-custom-color";
    customColor.title = translate("todoTaskColorCustom");
    const customColorInput = document.createElement("input");
    customColorInput.type = "color";
    customColorInput.value =
      appearance.color &&
      !TASK_APPEARANCE_COLORS.some(
        (option) => option.value === appearance.color
      )
        ? appearance.color
        : "#3b82f6";
    customColorInput.dataset.todoCustomColor = "true";
    customColorInput.setAttribute(
      "aria-label",
      translate("todoTaskColorCustom")
    );
    customColor.appendChild(customColorInput);
    colors.appendChild(customColor);
    colorGroup.append(colorLabel, colors);

    const iconGroup = document.createElement("div");
    iconGroup.className = "todo-appearance-group";
    const iconLabel = document.createElement("span");
    iconLabel.className = "todo-appearance-label";
    iconLabel.textContent = translate("todoTaskIconLabel");
    const icons = document.createElement("div");
    icons.className = "todo-appearance-options is-icons";
    const noIcon = document.createElement("button");
    noIcon.type = "button";
    noIcon.className =
      "todo-appearance-choice todo-appearance-icon";
    noIcon.dataset.todoAction = "select-edit-icon";
    noIcon.dataset.todoAppearanceIcon = "";
    noIcon.textContent = "—";
    noIcon.title = translate("todoTaskIconNone");
    noIcon.setAttribute("aria-label", noIcon.title);
    icons.appendChild(noIcon);
    Object.entries(taskAppearanceIconMarkup).forEach(
      ([iconId, markup]) => {
        const button = document.createElement("button");
        const label = translate(
          `todoTaskIcon${iconId[0].toUpperCase()}${iconId.slice(1)}`
        );
        button.type = "button";
        button.className =
          "todo-appearance-choice todo-appearance-icon";
        button.dataset.todoAction = "select-edit-icon";
        button.dataset.todoAppearanceIcon = iconId;
        button.innerHTML = markup;
        button.title = label;
        button.setAttribute("aria-label", label);
        icons.appendChild(button);
      }
    );
    iconGroup.append(iconLabel, icons);
    section.append(header, colorGroup, iconGroup);
    requestAnimationFrame(() => updateTaskAppearanceEditor(form));
    return section;
  }

  function createTaskEditor(task) {
    const form = document.createElement("form");
    form.className = "todo-inline-editor";
    form.dataset.todoEditorId = task.id;
    form.noValidate = true;
    const appearanceEditor = createTaskAppearanceEditor(task, form);

    const titleLabel = document.createElement("label");
    titleLabel.className = "todo-field";
    const titleText = document.createElement("span");
    titleText.textContent = translate("todoTaskTitleLabel");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.maxLength = 200;
    titleInput.value = task.title;
    titleInput.dataset.todoEditorField = "title";
    titleLabel.append(titleText, titleInput);

    const notesLabel = document.createElement("label");
    notesLabel.className = "todo-field";
    const notesText = document.createElement("span");
    notesText.textContent = translate("todoNotesLabel");
    const notesInput = document.createElement("textarea");
    notesInput.rows = 3;
    notesInput.maxLength = 10000;
    notesInput.value = task.notes;
    notesInput.dataset.todoEditorField = "notes";
    notesLabel.append(notesText, notesInput);

    const deadlineFields = document.createElement("div");
    deadlineFields.className = "todo-deadline-fields";
    const dateLabel = document.createElement("label");
    dateLabel.className = "todo-field";
    const dateText = document.createElement("span");
    dateText.textContent = translate("todoDeadlineDateLabel");
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = task.deadline?.date || "";
    dateInput.dataset.todoEditorField = "deadlineDate";
    dateLabel.append(dateText, dateInput);
    const timeLabel = document.createElement("label");
    timeLabel.className = "todo-field";
    const timeText = document.createElement("span");
    timeText.textContent = translate("todoDeadlineTimeLabel");
    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = task.deadline?.time || "";
    timeInput.dataset.todoEditorField = "deadlineTime";
    timeLabel.append(timeText, timeInput);
    deadlineFields.append(dateLabel, timeLabel);

    const checklistEditor = document.createElement("div");
    checklistEditor.className = "todo-checklist-editor";
    const checklistLabel = document.createElement("span");
    checklistLabel.className = "todo-checklist-label";
    checklistLabel.textContent = translate("todoChecklistLabel");
    const checklistRows = document.createElement("div");
    checklistRows.dataset.todoEditorChecklist = "";
    task.checklist.forEach((item) => {
      appendEditorChecklistRow(checklistRows, item);
    });
    const checklistAdd = document.createElement("div");
    checklistAdd.className = "todo-checklist-add-row";
    const checklistInput = document.createElement("input");
    checklistInput.type = "text";
    checklistInput.maxLength = 300;
    checklistInput.dataset.todoEditorChecklistInput = "";
    checklistInput.placeholder = translate("todoChecklistPlaceholder");
    const checklistButton = document.createElement("button");
    checklistButton.type = "button";
    checklistButton.dataset.todoAction = "add-edit-checklist";
    checklistButton.textContent = translate("todoAddChecklistItem");
    checklistAdd.append(checklistInput, checklistButton);
    checklistEditor.append(checklistLabel, checklistRows, checklistAdd);

    const error = document.createElement("div");
    error.className = "todo-composer-error";
    error.dataset.todoEditorError = "";
    error.hidden = true;

    const actions = document.createElement("div");
    actions.className = "todo-composer-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "todo-secondary-btn";
    cancel.dataset.todoAction = "cancel-edit";
    cancel.textContent = translate("cancel");
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "todo-primary-btn";
    save.textContent = translate("todoSaveChanges");
    actions.append(cancel, save);

    form.append(
      titleLabel,
      notesLabel,
      deadlineFields,
      appearanceEditor,
      checklistEditor,
      error,
      actions
    );
    return form;
  }

  function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "todo-task";
    card.dataset.todoTaskId = task.id;
    card.classList.toggle("is-completed", task.state === "completed");
    card.classList.toggle("is-expanded", expandedTaskIds.has(task.id));
    applyTaskAppearance(card, task);

    if (editingTaskId === task.id) {
      card.classList.add("is-editing");
      card.appendChild(createTaskEditor(task));
      return card;
    }

    card.dataset.todoDraggable = "true";
    const row = document.createElement("div");
    row.className = "todo-task-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-task-checkbox";
    checkbox.checked = task.state === "completed";
    checkbox.dataset.todoAction = "toggle-complete";
    checkbox.dataset.todoTaskId = task.id;
    checkbox.setAttribute("aria-label", translate("todoToggleComplete"));

    const main = document.createElement("div");
    main.className = "todo-task-main";
    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "todo-task-title";
    titleButton.dataset.todoAction = "toggle-task-details";
    titleButton.dataset.todoTaskId = task.id;
    titleButton.setAttribute(
      "aria-expanded",
      String(expandedTaskIds.has(task.id))
    );
    titleButton.textContent = task.title;
    const appearanceIcon = createTaskAppearanceIcon(task);

    if (appearanceIcon) {
      main.appendChild(appearanceIcon);
    }

    main.appendChild(titleButton);
    const deadlineBadge = createDeadlineBadge(task);

    if (deadlineBadge) {
      main.appendChild(deadlineBadge);
    }

    const actions = document.createElement("div");
    actions.className = "todo-task-actions";

    if (task.source?.type === "gmailThread") {
      actions.appendChild(
        createIconButton(
          "show-email-task",
          translate("todoEmailTaskShow"),
          "emailView",
          task.id
        )
      );
    }

    actions.appendChild(
      createIconButton(
        "edit-task",
        translate("todoEditTask"),
        "edit",
        task.id
      )
    );

    if (task.state === "completed") {
      actions.appendChild(
        createIconButton(
          "archive-task",
          translate("todoArchiveTask"),
          "archive",
          task.id
        )
      );
    }

    actions.appendChild(
      createIconButton(
        "delete-task",
        translate("todoDeleteTask"),
        "delete",
        task.id
      )
    );
    const expandButton = createIconButton(
      "toggle-task-details",
      translate(
        expandedTaskIds.has(task.id)
          ? "todoCollapseTask"
          : "todoExpandTask"
      ),
      "expand",
      task.id
    );
    expandButton.classList.add("todo-task-expand");
    expandButton.setAttribute(
      "aria-expanded",
      String(expandedTaskIds.has(task.id))
    );
    actions.appendChild(expandButton);
    row.append(createTaskDragHandle(task.id), checkbox, main, actions);
    card.appendChild(row);

    if (expandedTaskIds.has(task.id)) {
      const details = document.createElement("div");
      details.className = "todo-task-details";

      if (task.source?.type === "gmailThread") {
        details.appendChild(createEmailSourceCard(task));
      }

      if (task.notes) {
        const notes = document.createElement("p");
        notes.className = "todo-task-notes";
        notes.textContent = task.notes;
        details.appendChild(notes);
      }

      if (task.checklist.length) {
        details.appendChild(createChecklistDisplay(task));
      }

      const dates = document.createElement("div");
      dates.className = "todo-task-dates";
      dates.textContent = translate("todoCreatedDate", {
        date: formatDate(task.createdAt)
      });

      if (task.completedAt) {
        dates.textContent += ` · ${translate("todoCompletedDate", {
          date: formatDate(task.completedAt, true)
        })}`;
      }

      details.appendChild(dates);
      card.appendChild(details);
    }

    return card;
  }

  function createArchivedTask(task) {
    const item = document.createElement("article");
    item.className = "todo-archived-task";
    item.dataset.todoTaskId = task.id;
    applyTaskAppearance(item, task);
    const main = document.createElement("div");
    main.className = "todo-archived-main";
    const titleRow = document.createElement("div");
    titleRow.className = "todo-archived-title-row";
    const title = document.createElement("strong");
    title.textContent = task.title;
    const appearanceIcon = createTaskAppearanceIcon(task);

    if (appearanceIcon) {
      titleRow.appendChild(appearanceIcon);
    }

    titleRow.appendChild(title);
    const dates = document.createElement("span");
    dates.textContent = `${translate("todoCreatedDate", {
      date: formatDate(task.createdAt)
    })} · ${translate("todoCompletedDate", {
      date: formatDate(task.completedAt || task.archivedAt, true)
    })}`;
    main.append(titleRow, dates);
    const actions = document.createElement("div");
    actions.className = "todo-task-actions";

    if (task.source?.type === "gmailThread") {
      actions.appendChild(
        createIconButton(
          "show-email-task",
          translate("todoEmailTaskShow"),
          "emailView",
          task.id
        )
      );
    }

    actions.append(
      createIconButton(
        "restore-task",
        translate("todoRestoreTask"),
        "restore",
        task.id
      ),
      createIconButton(
        "delete-task",
        translate("todoDeleteTask"),
        "delete",
        task.id
      )
    );
    item.append(main, actions);
    return item;
  }

  function getTodoTaskCards(list) {
    return Array.from(
      list?.querySelectorAll(
        '.todo-task[data-todo-draggable="true"][data-todo-task-id]'
      ) || []
    ).filter((card) => !card.classList.contains("is-drag-source"));
  }

  function getTodoTaskDomOrder(list) {
    return getTodoTaskCards(list)
      .map((card) => card.dataset.todoTaskId)
      .filter(Boolean);
  }

  function getTodoTaskInsertBefore(list, clientY) {
    return (
      getTodoTaskCards(list).find((card) => {
        const rect = card.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      }) || null
    );
  }

  function hasTaskOrderChanged(beforeOrder, afterOrder) {
    return (
      beforeOrder.length !== afterOrder.length ||
      beforeOrder.some(
        (taskId, index) => taskId !== afterOrder[index]
      )
    );
  }

  function startTaskPointerDrag(event, state) {
    const { card, handle, list } = state;
    const rect = card.getBoundingClientRect();
    const rowHeight =
      card.querySelector(".todo-task-row")?.offsetHeight ||
      rect.height;
    const placeholder = document.createElement("article");
    placeholder.className = "todo-task todo-task-placeholder";
    placeholder.style.height = `${rect.height}px`;
    const ghost = card.cloneNode(true);
    ghost.classList.add("todo-task-drag-ghost");
    ghost.classList.remove("is-expanded");
    ghost.querySelector(".todo-task-details")?.remove();
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rowHeight}px`;

    state.dragging = true;
    state.offsetX = event.clientX - rect.left;
    state.offsetY = event.clientY - rect.top;
    state.placeholder = placeholder;
    state.ghost = ghost;

    if (handle.setPointerCapture) {
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {}
    }

    list.classList.add("is-reordering");
    card.classList.add("is-drag-source");
    list.insertBefore(placeholder, card);
    card.remove();
    document.body.appendChild(ghost);
    updateTaskPointerDrag(event);
  }

  function updateTaskPointerDrag(event) {
    const state = taskDragState;

    if (!state?.dragging) {
      return;
    }

    if (state.ghost) {
      state.ghost.style.transform =
        `translate3d(${event.clientX - state.offsetX}px, ` +
        `${event.clientY - state.offsetY}px, 0)`;
    }

    const insertBefore = getTodoTaskInsertBefore(
      state.list,
      event.clientY
    );

    if (insertBefore) {
      state.list.insertBefore(state.placeholder, insertBefore);
    } else {
      state.list.appendChild(state.placeholder);
    }
  }

  async function finishTaskPointerDrag(
    event,
    { cancelled = false } = {}
  ) {
    const state = taskDragState;

    if (!state) {
      return;
    }

    taskDragState = null;

    if (state.handle?.releasePointerCapture) {
      try {
        state.handle.releasePointerCapture(event.pointerId);
      } catch {}
    }

    if (!state.dragging) {
      return;
    }

    if (state.placeholder && state.list) {
      state.list.insertBefore(state.card, state.placeholder);
      state.placeholder.remove();
    }

    state.ghost?.remove();
    state.card?.classList.remove("is-drag-source");
    state.list?.classList.remove("is-reordering");

    if (cancelled) {
      renderWidget();
      return;
    }

    const finalOrder = getTodoTaskDomOrder(state.list);

    if (
      !hasTaskOrderChanged(state.initialOrder, finalOrder)
    ) {
      return;
    }

    const result = await runMutation(
      () => service.reorderTasks(finalOrder),
      translate("todoTasksReordered")
    );

    if (result?.changed) {
      requestAnimationFrame(() => {
        document
          .querySelector(
            `[data-todo-drag-handle="true"]` +
            `[data-todo-task-id="${CSS.escape(
              state.card.dataset.todoTaskId
            )}"]`
          )
          ?.focus();
      });
    }
  }

  async function moveTaskByKeyboard(taskId, direction) {
    if (busy || taskDragState || editingTaskId) {
      return;
    }

    const list = document.getElementById("todoList");
    const order = getTodoTaskDomOrder(list);
    const currentIndex = order.indexOf(taskId);
    const nextIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= order.length
    ) {
      return;
    }

    [order[currentIndex], order[nextIndex]] = [
      order[nextIndex],
      order[currentIndex]
    ];
    const result = await runMutation(
      () => service.reorderTasks(order),
      translate("todoTasksReordered")
    );

    if (result?.changed) {
      requestAnimationFrame(() => {
        document
          .querySelector(
            `[data-todo-drag-handle="true"]` +
            `[data-todo-task-id="${CSS.escape(taskId)}"]`
          )
          ?.focus();
      });
    }
  }

  function getUndoLabel(label) {
    const keys = {
      add: "todoUndoAdd",
      edit: "todoUndoEdit",
      checklist: "todoUndoChecklist",
      complete: "todoUndoComplete",
      completeArchive: "todoUndoComplete",
      completeDelete: "todoUndoComplete",
      reopen: "todoUndoReopen",
      archive: "todoUndoArchive",
      restore: "todoUndoRestore",
      delete: "todoUndoDelete",
      reorder: "todoUndoReorder"
    };
    return translate(keys[label] || "todoUndoChange");
  }

  function renderWidget() {
    const list = document.getElementById("todoList");
    const empty = document.getElementById("todoEmpty");
    const count = document.getElementById("todoWidgetCount");
    const undoButton = document.getElementById("todoUndoBtn");
    const archive = document.getElementById("todoArchive");
    const archiveBody = document.getElementById("todoArchiveBody");
    const archiveToggle = document.getElementById("todoArchiveToggle");
    const archiveCount = document.getElementById("todoArchiveCount");
    const archiveList = document.getElementById("todoArchiveList");

    if (!list || !empty || !count || !undoButton || !archive || !archiveList) {
      return;
    }

    if (taskDragState) {
      return;
    }

    const tasks = snapshot.state.tasks || [];
    const activeTasks = getActiveTasksInOrder(
      tasks.filter((task) => task.state !== "archived")
    );
    const archivedTasks = tasks
      .filter((task) => task.state === "archived")
      .sort(
        (first, second) =>
          new Date(second.completedAt || second.archivedAt) -
          new Date(first.completedAt || first.archivedAt)
      );

    if (
      editingTaskId &&
      !activeTasks.some((task) => task.id === editingTaskId)
    ) {
      editingTaskId = "";
    }

    list.replaceChildren(
      ...activeTasks.map((task) => createTaskCard(task))
    );
    empty.hidden = activeTasks.length > 0;
    count.textContent = translate(
      activeTasks.length === 1 ? "todoTaskCount" : "todoTasksCount",
      { count: activeTasks.length }
    );
    undoButton.disabled = busy || snapshot.undoCount < 1;
    undoButton.title = snapshot.undoCount
      ? `${translate("todoUndo")}: ${getUndoLabel(snapshot.latestUndoLabel)}`
      : translate("todoNothingToUndo");

    archive.hidden = archivedTasks.length === 0;
    archiveCount.textContent = archivedTasks.length
      ? `(${archivedTasks.length})`
      : "";
    archiveToggle?.setAttribute("aria-expanded", String(archiveExpanded));

    if (archiveBody) {
      archiveBody.hidden = !archiveExpanded;
    }

    archiveList.replaceChildren(
      ...archivedTasks.map((task) => createArchivedTask(task))
    );
  }

  function renderComposerChecklist() {
    const container = document.getElementById("todoComposerChecklist");

    if (!container) {
      return;
    }

    container.replaceChildren();
    composerChecklist.forEach((item) => {
      const row = document.createElement("div");
      row.className = "todo-editor-checklist-row";
      const marker = document.createElement("span");
      marker.className = "todo-checklist-dot";
      marker.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = item.text;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.todoAction = "remove-composer-checklist";
      remove.dataset.todoChecklistId = item.id;
      remove.title = translate("todoRemoveChecklistItem");
      remove.setAttribute("aria-label", translate("todoRemoveChecklistItem"));
      remove.textContent = "×";
      row.append(marker, text, remove);
      container.appendChild(row);
    });
  }

  function resetComposer() {
    const form = document.getElementById("todoComposer");
    const details = document.getElementById("todoComposerDetails");
    const toggle = document.getElementById("todoDetailsToggle");
    form?.reset();
    form?.setAttribute("hidden", "");
    details?.setAttribute("hidden", "");
    toggle?.setAttribute("aria-expanded", "false");
    composerChecklist = [];
    renderComposerChecklist();
    setComposerError("");
  }

  function setComposerError(message) {
    const error = document.getElementById("todoComposerError");

    if (!error) {
      return;
    }

    error.textContent = message;
    error.hidden = !message;
  }

  function addComposerChecklistItem() {
    const input = document.getElementById("todoChecklistInput");
    const text = String(input?.value || "").trim();

    if (!text) {
      input?.focus();
      return;
    }

    composerChecklist.push({
      id: createTemporaryId(),
      text: text.slice(0, 300),
      completed: false
    });
    input.value = "";
    renderComposerChecklist();
    input.focus();
  }

  function addEditorChecklistItem(form) {
    const input = form?.querySelector("[data-todo-editor-checklist-input]");
    const container = form?.querySelector("[data-todo-editor-checklist]");
    const text = String(input?.value || "").trim();

    if (!input || !container || !text) {
      input?.focus();
      return;
    }

    appendEditorChecklistRow(container, {
      id: createTemporaryId(),
      text: text.slice(0, 300),
      completed: false
    });
    input.value = "";
    input.focus();
  }

  function getEditorPayload(form) {
    const deadlineDate =
      form.querySelector('[data-todo-editor-field="deadlineDate"]')?.value || "";
    const deadlineTime =
      form.querySelector('[data-todo-editor-field="deadlineTime"]')?.value || "";
    const checklist = Array.from(
      form.querySelectorAll(".todo-editor-checklist-row")
    )
      .map((row) => ({
        id: row.dataset.todoChecklistId,
        text:
          row.querySelector(".todo-editor-checklist-text")?.value || "",
        completed:
          row.querySelector(".todo-editor-checklist-completed")?.checked === true
      }))
      .filter((item) => item.text.trim());

    return {
      title:
        form.querySelector('[data-todo-editor-field="title"]')?.value || "",
      notes:
        form.querySelector('[data-todo-editor-field="notes"]')?.value || "",
      deadline: deadlineDate
        ? {
            date: deadlineDate,
            time: deadlineTime || null
          }
        : null,
      appearance: {
        color: form.dataset.todoAppearanceColor || null,
        icon: form.dataset.todoAppearanceIcon || null
      },
      checklist
    };
  }

  function showUndoToast(message) {
    if (typeof globalObject.showToast !== "function") {
      return;
    }

    globalObject.showToast(message, {
      actionLabel: translate("todoUndo"),
      onAction: () => {
        void handleUndo();
      },
      duration: 5000
    });
  }

  async function runMutation(operation, successMessage = "") {
    if (busy) {
      return null;
    }

    busy = true;
    document.getElementById("todoWidget")?.setAttribute("aria-busy", "true");
    renderWidget();

    try {
      const result = await operation();
      await refresh();

      if (result?.changed && successMessage) {
        showUndoToast(successMessage);
      }

      return result;
    } catch (error) {
      console.warn("[tab-out] TODO mutation failed:", error);

      if (typeof globalObject.showToast === "function") {
        globalObject.showToast(
          error?.message === "TODO_TITLE_REQUIRED"
            ? translate("todoTitleRequired")
            : translate("todoSaveFailed")
        );
      }

      return null;
    } finally {
      busy = false;
      document.getElementById("todoWidget")?.removeAttribute("aria-busy");
      renderWidget();
    }
  }

  async function refresh() {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = service
      .getSnapshot()
      .then((nextSnapshot) => {
        snapshot = nextSnapshot;
        renderWidget();
        return snapshot;
      })
      .catch((error) => {
        console.warn("[tab-out] TODO data could not be loaded:", error);
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function handleAddSubmit() {
    const title = document.getElementById("todoTitleInput")?.value || "";
    const notes = document.getElementById("todoNotesInput")?.value || "";
    const deadlineDate =
      document.getElementById("todoDeadlineDateInput")?.value || "";
    const deadlineTime =
      document.getElementById("todoDeadlineTimeInput")?.value || "";

    if (!title.trim()) {
      setComposerError(translate("todoTitleRequired"));
      document.getElementById("todoTitleInput")?.focus();
      return;
    }

    const result = await runMutation(
      () =>
        service.addTask({
          title,
          notes,
          deadline: deadlineDate
            ? { date: deadlineDate, time: deadlineTime || null }
            : null,
          checklist: composerChecklist
        }),
      translate("todoTaskAdded")
    );

    if (result?.changed) {
      resetComposer();
    }
  }

  async function handleEditSubmit(form) {
    const payload = getEditorPayload(form);
    const error = form.querySelector("[data-todo-editor-error]");

    if (!payload.title.trim()) {
      error.textContent = translate("todoTitleRequired");
      error.hidden = false;
      form.querySelector('[data-todo-editor-field="title"]')?.focus();
      return;
    }

    const result = await runMutation(
      () => service.updateTask(form.dataset.todoEditorId, payload),
      translate("todoTaskUpdated")
    );

    if (result) {
      editingTaskId = "";
      renderWidget();
    }
  }

  async function handleUndo() {
    if (busy) {
      return;
    }

    busy = true;
    renderWidget();

    try {
      const result = await service.undo();
      await refresh();

      if (typeof globalObject.showToast === "function") {
        globalObject.showToast(
          result.ok
            ? translate("todoUndoSuccess")
            : result.reason === "conflict"
              ? translate("todoUndoConflict")
              : translate("todoNothingToUndo")
        );
      }
    } catch (error) {
      console.warn("[tab-out] TODO undo failed:", error);
      globalObject.showToast?.(translate("todoUndoFailed"));
    } finally {
      busy = false;
      renderWidget();
    }
  }

  async function openEmailTaskSource(source) {
    if (!source?.accountEmail || !source.threadId) {
      globalObject.showToast?.(translate("todoEmailTaskUnavailable"));
      return false;
    }

    const accountId = resolveGmailAccountId(source);
    const response = accountId
      ? await sendGmailMessage({
          type: "tabOutGmail:open",
          accountId,
          threadId: source.threadId
        })
      : { ok: false };

    if (response.ok) {
      return true;
    }

    try {
      await chrome.tabs.create({
        url:
          "https://mail.google.com/mail/?authuser=" +
          `${encodeURIComponent(source.accountEmail)}#all/` +
          encodeURIComponent(source.threadId),
        active: true
      });
      return true;
    } catch {
      globalObject.showToast?.(translate("todoEmailTaskUnavailable"));
      return false;
    }
  }

  async function showEmailTaskSource(source) {
    const result =
      await globalObject.TabOutGmailWidget?.showLinkedThread?.(source);

    if (result?.ok) {
      return true;
    }

    globalObject.showToast?.(
      translate(result?.messageKey || "todoEmailTaskShowFailed")
    );
    return false;
  }

  async function applyEmailCompletionAction(source) {
    const settings = getTodoSettings();
    const action = settings.emailCompletionAction;
    const accountId = resolveGmailAccountId(source);

    if (
      settings.emailTaskIntegrationEnabled === false ||
      !accountId ||
      !["markRead", "archive"].includes(action)
    ) {
      return;
    }

    const response = await sendGmailMessage({
      type: "tabOutGmail:action",
      accountId,
      threadId: source.threadId,
      action
    });

    if (!response.ok) {
      globalObject.showToast?.(translate("todoEmailActionFailed"));
      return;
    }

    void globalObject.TabOutGmailWidget?.refresh?.({ force: true });
  }

  async function handleClick(event) {
    const button = event.target.closest("[data-todo-action]");

    if (!button) {
      return;
    }

    const action = button.dataset.todoAction;
    const taskId = button.dataset.todoTaskId;

    if (action === "open-add") {
      const form = document.getElementById("todoComposer");
      form.hidden = false;
      document.getElementById("todoTitleInput")?.focus();
      return;
    }

    if (action === "cancel-add") {
      resetComposer();
      return;
    }

    if (action === "toggle-add-details") {
      const details = document.getElementById("todoComposerDetails");
      const expanded = details.hidden;
      details.hidden = !expanded;
      button.setAttribute("aria-expanded", String(expanded));
      return;
    }

    if (action === "add-composer-checklist") {
      addComposerChecklistItem();
      return;
    }

    if (action === "remove-composer-checklist") {
      composerChecklist = composerChecklist.filter(
        (item) => item.id !== button.dataset.todoChecklistId
      );
      renderComposerChecklist();
      return;
    }

    if (action === "select-edit-color") {
      const form = button.closest("[data-todo-editor-id]");

      if (form) {
        form.dataset.todoAppearanceColor =
          button.dataset.todoAppearanceColor || "";
        updateTaskAppearanceEditor(form);
      }

      return;
    }

    if (action === "select-edit-icon") {
      const form = button.closest("[data-todo-editor-id]");

      if (form) {
        form.dataset.todoAppearanceIcon =
          button.dataset.todoAppearanceIcon || "";
        updateTaskAppearanceEditor(form);
      }

      return;
    }

    if (action === "toggle-task-details") {
      if (expandedTaskIds.has(taskId)) {
        expandedTaskIds.delete(taskId);
      } else {
        expandedTaskIds.add(taskId);
      }
      renderWidget();
      return;
    }

    if (action === "open-email-task") {
      await openEmailTaskSource(getTaskById(taskId)?.source);
      return;
    }

    if (action === "show-email-task") {
      button.disabled = true;

      try {
        await showEmailTaskSource(getTaskById(taskId)?.source);
      } finally {
        button.disabled = false;
      }

      return;
    }

    if (action === "edit-task") {
      editingTaskId = taskId;
      expandedTaskIds.add(taskId);
      renderWidget();
      requestAnimationFrame(() => {
        document
          .querySelector(
            `[data-todo-editor-id="${CSS.escape(taskId)}"] [data-todo-editor-field="title"]`
          )
          ?.focus();
      });
      return;
    }

    if (action === "cancel-edit") {
      editingTaskId = "";
      renderWidget();
      return;
    }

    if (action === "add-edit-checklist") {
      addEditorChecklistItem(button.closest("form"));
      return;
    }

    if (action === "remove-edit-checklist") {
      button.closest(".todo-editor-checklist-row")?.remove();
      return;
    }

    if (action === "toggle-archive") {
      archiveExpanded = !archiveExpanded;
      renderWidget();
      return;
    }

    if (action === "undo") {
      await handleUndo();
      return;
    }

    if (action === "archive-task") {
      await runMutation(
        () => service.archiveTask(taskId),
        translate("todoTaskArchived")
      );
      return;
    }

    if (action === "restore-task") {
      await runMutation(
        () => service.restoreTask(taskId),
        translate("todoTaskRestored")
      );
      return;
    }

    if (action === "delete-task") {
      await runMutation(
        () => service.deleteTask(taskId),
        translate("todoTaskDeleted")
      );
    }
  }

  async function handleChange(event) {
    const customColor = event.target.closest(
      "[data-todo-custom-color]"
    );

    if (customColor) {
      const form = customColor.closest("[data-todo-editor-id]");

      if (form) {
        form.dataset.todoAppearanceColor = customColor.value;
        updateTaskAppearanceEditor(form);
      }

      return;
    }

    const input = event.target.closest("[data-todo-action]");

    if (!input) {
      return;
    }

    if (input.dataset.todoAction === "toggle-complete") {
      const completed = input.checked;
      const completionAction = getTodoSettings().completionAction;
      const source = getTaskById(input.dataset.todoTaskId)?.source || null;
      const result = await runMutation(
        () =>
          service.setTaskCompleted(
            input.dataset.todoTaskId,
            completed,
            completionAction
          ),
        completed
          ? completionAction === "delete"
            ? translate("todoTaskDeleted")
            : completionAction === "archive"
              ? translate("todoTaskArchived")
              : translate("todoTaskCompleted")
          : translate("todoTaskReopened")
      );

      if (completed && result?.changed && source) {
        await applyEmailCompletionAction(source);
      }

      return;
    }

    if (input.dataset.todoAction === "toggle-checklist") {
      await runMutation(() =>
        service.toggleChecklistItem(
          input.dataset.todoTaskId,
          input.dataset.todoChecklistId,
          input.checked
        )
      );
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "todoComposer") {
      event.preventDefault();
      void handleAddSubmit();
      return;
    }

    if (event.target.matches("[data-todo-editor-id]")) {
      event.preventDefault();
      void handleEditSubmit(event.target);
    }
  }

  function handleTaskPointerDown(event) {
    const handle = event.target.closest(
      '[data-todo-drag-handle="true"]'
    );

    if (
      !handle ||
      busy ||
      taskDragState ||
      editingTaskId ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }

    const card = handle.closest(
      '.todo-task[data-todo-draggable="true"]'
    );
    const list = card?.closest("#todoList");

    if (!card || !list) {
      return;
    }

    taskDragState = {
      card,
      handle,
      list,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      initialOrder: getTodoTaskDomOrder(list),
      placeholder: null,
      ghost: null
    };
  }

  function handleTaskPointerMove(event) {
    const state = taskDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = Math.abs(event.clientX - state.startX);
    const distanceY = Math.abs(event.clientY - state.startY);

    if (!state.dragging) {
      if (
        Math.max(distanceX, distanceY) < TASK_DRAG_THRESHOLD
      ) {
        return;
      }

      event.preventDefault();
      startTaskPointerDrag(event, state);
      return;
    }

    event.preventDefault();
    updateTaskPointerDrag(event);
  }

  function handleTaskPointerUp(event) {
    if (taskDragState?.pointerId === event.pointerId) {
      void finishTaskPointerDrag(event);
    }
  }

  function handleTaskPointerCancel(event) {
    if (taskDragState?.pointerId === event.pointerId) {
      void finishTaskPointerDrag(event, { cancelled: true });
    }
  }

  function handleKeydown(event) {
    const dragHandle = event.target.closest(
      '[data-todo-drag-handle="true"]'
    );

    if (
      dragHandle &&
      ["ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      void moveTaskByKeyboard(
        dragHandle.dataset.todoTaskId,
        event.key === "ArrowUp" ? -1 : 1
      );
      return;
    }

    if (
      event.key === "Enter" &&
      event.target.id === "todoChecklistInput"
    ) {
      event.preventDefault();
      addComposerChecklistItem();
      return;
    }

    if (
      event.key === "Enter" &&
      event.target.matches("[data-todo-editor-checklist-input]")
    ) {
      event.preventDefault();
      addEditorChecklistItem(event.target.closest("form"));
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    if (editingTaskId) {
      editingTaskId = "";
      renderWidget();
      return;
    }

    if (!document.getElementById("todoComposer")?.hidden) {
      resetComposer();
    }
  }

  async function initialize() {
    const widget = document.getElementById("todoWidget");

    if (!widget) {
      return;
    }

    widget.addEventListener("click", handleClick);
    widget.addEventListener("change", handleChange);
    widget.addEventListener("submit", handleSubmit);
    widget.addEventListener("keydown", handleKeydown);
    widget.addEventListener("pointerdown", handleTaskPointerDown);
    document.addEventListener("pointermove", handleTaskPointerMove);
    document.addEventListener("pointerup", handleTaskPointerUp);
    document.addEventListener(
      "pointercancel",
      handleTaskPointerCancel
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (
        areaName === "local" &&
        (changes[service.STORAGE_KEY] || changes[service.UNDO_KEY])
      ) {
        void refresh();
      }
    });

    document.addEventListener("tabout:settings-applied", () => {
      renderWidget();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        void refresh();
      }
    });

    await globalObject.TabOutDashboardRuntime?.ready;
    await refresh();
    setInterval(() => {
      if (!document.hidden) {
        renderWidget();
      }
    }, 60000);
  }

  async function focusTask(taskId) {
    await refresh();
    const task = getTaskById(taskId);
    const widget = document.getElementById("todoWidget");
    const wrapper = widget?.closest('[data-dashboard-module="todo"]');

    if (
      !task ||
      !widget ||
      widget.hidden ||
      wrapper?.hidden
    ) {
      return false;
    }

    if (task.state === "archived") {
      archiveExpanded = true;
    } else {
      expandedTaskIds.add(task.id);
    }

    renderWidget();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const target = document.querySelector(
      `[data-todo-task-id="${CSS.escape(task.id)}"]`
    );

    if (!target) {
      return false;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-targeted");
    target
      .querySelector(
        '[data-todo-action="toggle-task-details"], button, input'
      )
      ?.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove("is-targeted"), 1800);
    return true;
  }

  globalObject.TabOutTodoWidget = Object.freeze({
    focusTask,
    refresh,
    render: renderWidget
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    void initialize();
  }
})(globalThis);
