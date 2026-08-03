(function exposeTabOutTodoService(globalObject) {
  const STORAGE_KEY = "tabOutTodoStateV1";
  const UNDO_KEY = "tabOutTodoUndoV1";
  const STATE_VERSION = 4;
  const MAX_UNDO_ENTRIES = 20;
  const TASK_STATES = new Set(["active", "completed", "archived"]);
  const COMPLETION_ACTIONS = new Set([
    "archive",
    "keepCompleted",
    "delete"
  ]);
  const TASK_APPEARANCE_ICONS = new Set([
    "work",
    "personal",
    "email",
    "call",
    "shopping",
    "warning",
    "star"
  ]);
  let mutationQueue = Promise.resolve();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(prefix) {
    if (typeof globalObject.crypto?.randomUUID === "function") {
      return `${prefix}-${globalObject.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function normalizeIsoDate(value) {
    if (typeof value !== "string" || !value) {
      return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : null;
  }

  function normalizeDeadline(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value.date || ""))
      ? String(value.date)
      : "";
    const requestedTime = String(value.time || "");
    const timeParts = /^\d{2}:\d{2}$/.test(requestedTime)
      ? requestedTime.split(":").map(Number)
      : null;
    const time =
      timeParts &&
      timeParts[0] >= 0 &&
      timeParts[0] <= 23 &&
      timeParts[1] >= 0 &&
      timeParts[1] <= 59
        ? requestedTime
        : null;

    if (!date) {
      return null;
    }

    const dateParts = date.split("-").map(Number);
    const candidate = new Date(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2]
    );

    if (
      candidate.getFullYear() !== dateParts[0] ||
      candidate.getMonth() !== dateParts[1] - 1 ||
      candidate.getDate() !== dateParts[2]
    ) {
      return null;
    }

    return { date, time };
  }

  function normalizeChecklistItem(value) {
    const text = String(value?.text || "").trim().slice(0, 300);

    if (!text) {
      return null;
    }

    return {
      id: String(value?.id || createId("todo-item")).slice(0, 128),
      text,
      completed: value?.completed === true
    };
  }

  function normalizeTaskSource(value) {
    if (!value || value.type !== "gmailThread") {
      return null;
    }

    const accountId = String(value.accountId || "").slice(0, 128);
    const accountEmail = String(value.accountEmail || "")
      .trim()
      .toLowerCase()
      .slice(0, 320);
    const threadId = String(value.threadId || "").slice(0, 128);
    const latestMessageId = String(value.latestMessageId || "").slice(
      0,
      128
    );

    if (
      !accountEmail ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(threadId) ||
      (accountId && !/^[a-zA-Z0-9_-]{1,128}$/.test(accountId)) ||
      (
        latestMessageId &&
        !/^[a-zA-Z0-9_-]{1,128}$/.test(latestMessageId)
      )
    ) {
      return null;
    }

    return {
      type: "gmailThread",
      accountId,
      accountEmail,
      threadId,
      latestMessageId,
      senderName: String(value.senderName || "").trim().slice(0, 300),
      senderEmail: String(value.senderEmail || "")
        .trim()
        .slice(0, 320),
      subject: String(value.subject || "").trim().slice(0, 200),
      capturedAt:
        normalizeIsoDate(value.capturedAt) || new Date().toISOString()
    };
  }

  function normalizeTaskAppearance(value) {
    const requestedColor = String(value?.color || "").trim();
    const requestedIcon = String(value?.icon || "").trim();

    return {
      color: /^#[0-9a-f]{6}$/i.test(requestedColor)
        ? requestedColor.toLowerCase()
        : null,
      icon: TASK_APPEARANCE_ICONS.has(requestedIcon)
        ? requestedIcon
        : null
    };
  }

  function getTaskSourceKey(value) {
    const source = normalizeTaskSource(value);

    return source
      ? `gmail:${source.accountEmail}:${source.threadId}`
      : "";
  }

  function normalizeTask(value) {
    const title = String(value?.title || "").trim().slice(0, 200);

    if (!title) {
      return null;
    }

    const createdAt =
      normalizeIsoDate(value?.createdAt) || new Date().toISOString();
    const state = TASK_STATES.has(value?.state)
      ? value.state
      : "active";
    const completedAt =
      state === "active" ? null : normalizeIsoDate(value?.completedAt);
    const archivedAt =
      state === "archived" ? normalizeIsoDate(value?.archivedAt) : null;

    return {
      id: String(value?.id || createId("todo")).slice(0, 128),
      title,
      notes: String(value?.notes || "").trim().slice(0, 10000),
      checklist: Array.isArray(value?.checklist)
        ? value.checklist
            .slice(0, 100)
            .map(normalizeChecklistItem)
            .filter(Boolean)
        : [],
      state,
      createdAt,
      updatedAt: normalizeIsoDate(value?.updatedAt) || createdAt,
      completedAt,
      archivedAt,
      deadline: normalizeDeadline(value?.deadline),
      appearance: normalizeTaskAppearance(value?.appearance),
      source: normalizeTaskSource(value?.source)
    };
  }

  function normalizeState(value) {
    return {
      version: STATE_VERSION,
      revision: Math.max(0, Math.floor(Number(value?.revision) || 0)),
      tasks: Array.isArray(value?.tasks)
        ? value.tasks.map(normalizeTask).filter(Boolean)
        : []
    };
  }

  function normalizeUndoEntry(value) {
    const kind = value?.kind === "order" ? "order" : "task";
    const id = String(value?.id || createId("todo-undo")).slice(0, 128);
    const label = String(value?.label || "change").slice(0, 64);
    const createdAt =
      normalizeIsoDate(value?.createdAt) || new Date().toISOString();

    if (kind === "order") {
      const normalizeOrder = (order) => [
        ...new Set(
          (Array.isArray(order) ? order : [])
            .map((taskId) => String(taskId || "").slice(0, 128))
            .filter(Boolean)
        )
      ];
      const beforeOrder = normalizeOrder(value?.beforeOrder);
      const afterOrder = normalizeOrder(value?.afterOrder);

      if (
        !beforeOrder.length ||
        beforeOrder.length !== afterOrder.length
      ) {
        return null;
      }

      return {
        id,
        kind,
        label,
        createdAt,
        beforeOrder,
        afterOrder
      };
    }

    const taskId = String(value?.taskId || "").slice(0, 128);

    if (!taskId) {
      return null;
    }

    const before = value?.before ? normalizeTask(value.before) : null;
    const after = value?.after ? normalizeTask(value.after) : null;

    if (value?.before && !before) {
      return null;
    }

    if (value?.after && !after) {
      return null;
    }

    return {
      id,
      kind,
      taskId,
      label,
      createdAt,
      before,
      beforeIndex: Math.max(0, Math.floor(Number(value?.beforeIndex) || 0)),
      after
    };
  }

  function normalizeUndoState(value) {
    return {
      version: STATE_VERSION,
      entries: Array.isArray(value?.entries)
        ? value.entries
            .map(normalizeUndoEntry)
            .filter(Boolean)
            .slice(-MAX_UNDO_ENTRIES)
        : []
    };
  }

  function taskFingerprint(task) {
    return task ? JSON.stringify(normalizeTask(task)) : "";
  }

  async function readDocuments() {
    const stored = await chrome.storage.local.get([STORAGE_KEY, UNDO_KEY]);
    return {
      state: normalizeState(stored[STORAGE_KEY]),
      undo: normalizeUndoState(stored[UNDO_KEY])
    };
  }

  function enqueueMutation(operation) {
    const next = mutationQueue.then(operation, operation);
    mutationQueue = next.catch(() => {});
    return next;
  }

  async function writeDocuments(state, undo) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: normalizeState(state),
      [UNDO_KEY]: normalizeUndoState(undo)
    });
  }

  async function mutateTask(taskId, label, mutation) {
    return enqueueMutation(async () => {
      const documents = await readDocuments();
      const beforeIndex = documents.state.tasks.findIndex(
        (task) => task.id === taskId
      );
      const before =
        beforeIndex >= 0 ? clone(documents.state.tasks[beforeIndex]) : null;

      const mutationResult =
        mutation(documents.state.tasks) || {};

      const afterIndex = documents.state.tasks.findIndex(
        (task) => task.id === taskId
      );
      const after =
        afterIndex >= 0
          ? normalizeTask(documents.state.tasks[afterIndex])
          : null;

      if (afterIndex >= 0) {
        documents.state.tasks[afterIndex] = after;
      }

      if (taskFingerprint(before) === taskFingerprint(after)) {
        return {
          changed: false,
          task: mutationResult.task
            ? clone(normalizeTask(mutationResult.task))
            : after
              ? clone(after)
              : null,
          reason: String(mutationResult.reason || "")
        };
      }

      documents.state.revision += 1;
      documents.undo.entries.push({
        id: createId("todo-undo"),
        kind: "task",
        taskId,
        label,
        createdAt: new Date().toISOString(),
        before,
        beforeIndex: beforeIndex >= 0
          ? beforeIndex
          : Math.max(0, afterIndex),
        after: after ? clone(after) : null
      });
      documents.undo.entries =
        documents.undo.entries.slice(-MAX_UNDO_ENTRIES);

      await writeDocuments(documents.state, documents.undo);
      return {
        changed: true,
        task: after ? clone(after) : null,
        label
      };
    });
  }

  async function getSnapshot() {
    const documents = await readDocuments();
    const latest =
      documents.undo.entries[documents.undo.entries.length - 1] || null;

    return {
      state: clone(documents.state),
      undoCount: documents.undo.entries.length,
      latestUndoLabel: latest?.label || ""
    };
  }

  async function addTask(value) {
    const now = new Date().toISOString();
    const task = normalizeTask({
      ...value,
      id: createId("todo"),
      state: "active",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null
    });

    if (!task) {
      throw new Error("TODO_TITLE_REQUIRED");
    }

    return mutateTask(task.id, "add", (tasks) => {
      const sourceKey = getTaskSourceKey(task.source);
      const existing = sourceKey
        ? tasks.find(
            (candidate) =>
              getTaskSourceKey(candidate.source) === sourceKey
          )
        : null;

      if (existing) {
        return {
          reason: "duplicate",
          task: existing
        };
      }

      tasks.push(task);
      return {};
    });
  }

  async function updateTask(taskId, value, label = "edit") {
    return mutateTask(taskId, label, (tasks) => {
      const index = tasks.findIndex((task) => task.id === taskId);

      if (index < 0) {
        return;
      }

      const next = normalizeTask({
        ...tasks[index],
        ...value,
        id: tasks[index].id,
        createdAt: tasks[index].createdAt,
        state: tasks[index].state,
        completedAt: tasks[index].completedAt,
        archivedAt: tasks[index].archivedAt,
        updatedAt: new Date().toISOString()
      });

      if (!next) {
        throw new Error("TODO_TITLE_REQUIRED");
      }

      tasks[index] = next;
    });
  }

  async function toggleChecklistItem(taskId, checklistItemId, completed) {
    return mutateTask(taskId, "checklist", (tasks) => {
      const task = tasks.find((candidate) => candidate.id === taskId);
      const checklistItem = task?.checklist.find(
        (candidate) => candidate.id === checklistItemId
      );

      if (!checklistItem || checklistItem.completed === completed) {
        return;
      }

      checklistItem.completed = completed;
      task.updatedAt = new Date().toISOString();
    });
  }

  async function setTaskCompleted(
    taskId,
    completed,
    completionAction = "archive"
  ) {
    const action = COMPLETION_ACTIONS.has(completionAction)
      ? completionAction
      : "archive";

    return mutateTask(
      taskId,
      completed
        ? action === "delete"
          ? "completeDelete"
          : action === "archive"
            ? "completeArchive"
            : "complete"
        : "reopen",
      (tasks) => {
        const index = tasks.findIndex((task) => task.id === taskId);

        if (index < 0) {
          return;
        }

        if (completed && action === "delete") {
          tasks.splice(index, 1);
          return;
        }

        const timestamp = new Date().toISOString();
        tasks[index].state = completed
          ? action === "archive"
            ? "archived"
            : "completed"
          : "active";
        tasks[index].completedAt = completed ? timestamp : null;
        tasks[index].archivedAt =
          completed && action === "archive" ? timestamp : null;
        tasks[index].updatedAt = timestamp;
      }
    );
  }

  async function archiveTask(taskId) {
    return mutateTask(taskId, "archive", (tasks) => {
      const task = tasks.find((candidate) => candidate.id === taskId);

      if (!task) {
        return;
      }

      const timestamp = new Date().toISOString();
      task.state = "archived";
      task.completedAt = task.completedAt || timestamp;
      task.archivedAt = timestamp;
      task.updatedAt = timestamp;
    });
  }

  async function restoreTask(taskId) {
    return mutateTask(taskId, "restore", (tasks) => {
      const task = tasks.find((candidate) => candidate.id === taskId);

      if (!task) {
        return;
      }

      task.state = "active";
      task.completedAt = null;
      task.archivedAt = null;
      task.updatedAt = new Date().toISOString();
    });
  }

  async function deleteTask(taskId) {
    return mutateTask(taskId, "delete", (tasks) => {
      const index = tasks.findIndex((task) => task.id === taskId);

      if (index >= 0) {
        tasks.splice(index, 1);
      }
    });
  }

  function getActiveTaskOrder(tasks) {
    return tasks
      .filter((task) => task.state !== "archived")
      .map((task) => task.id);
  }

  function applyActiveTaskOrder(tasks, requestedOrder) {
    const activeTasks = tasks.filter(
      (task) => task.state !== "archived"
    );
    const activeById = new Map(
      activeTasks.map((task) => [task.id, task])
    );
    const orderedTasks = [];
    const seen = new Set();

    (Array.isArray(requestedOrder) ? requestedOrder : []).forEach(
      (taskId) => {
        const id = String(taskId || "");
        const task = activeById.get(id);

        if (task && !seen.has(id)) {
          orderedTasks.push(task);
          seen.add(id);
        }
      }
    );
    activeTasks.forEach((task) => {
      if (!seen.has(task.id)) {
        orderedTasks.push(task);
      }
    });

    let activeIndex = 0;
    return tasks.map((task) =>
      task.state === "archived"
        ? task
        : orderedTasks[activeIndex++]
    );
  }

  async function reorderTasks(orderedTaskIds) {
    return enqueueMutation(async () => {
      const documents = await readDocuments();
      const beforeOrder = getActiveTaskOrder(documents.state.tasks);
      const nextTasks = applyActiveTaskOrder(
        documents.state.tasks,
        orderedTaskIds
      );
      const afterOrder = getActiveTaskOrder(nextTasks);

      if (JSON.stringify(beforeOrder) === JSON.stringify(afterOrder)) {
        return { changed: false };
      }

      documents.state.tasks = nextTasks;
      documents.state.revision += 1;
      documents.undo.entries.push({
        id: createId("todo-undo"),
        kind: "order",
        label: "reorder",
        createdAt: new Date().toISOString(),
        beforeOrder,
        afterOrder
      });
      documents.undo.entries =
        documents.undo.entries.slice(-MAX_UNDO_ENTRIES);
      await writeDocuments(documents.state, documents.undo);
      return {
        changed: true,
        label: "reorder",
        order: afterOrder
      };
    });
  }

  async function undo() {
    return enqueueMutation(async () => {
      const documents = await readDocuments();
      const entry = documents.undo.entries.pop();

      if (!entry) {
        return { ok: false, reason: "empty" };
      }

      if (entry.kind === "order") {
        const currentOrder = getActiveTaskOrder(
          documents.state.tasks
        );

        if (
          JSON.stringify(currentOrder) !==
          JSON.stringify(entry.afterOrder)
        ) {
          await chrome.storage.local.set({
            [UNDO_KEY]: normalizeUndoState(documents.undo)
          });
          return { ok: false, reason: "conflict" };
        }

        documents.state.tasks = applyActiveTaskOrder(
          documents.state.tasks,
          entry.beforeOrder
        );
        documents.state.revision += 1;
        await writeDocuments(documents.state, documents.undo);
        return {
          ok: true,
          label: entry.label,
          order: getActiveTaskOrder(documents.state.tasks)
        };
      }

      const currentIndex = documents.state.tasks.findIndex(
        (task) => task.id === entry.taskId
      );
      const current =
        currentIndex >= 0 ? documents.state.tasks[currentIndex] : null;

      if (taskFingerprint(current) !== taskFingerprint(entry.after)) {
        await chrome.storage.local.set({
          [UNDO_KEY]: normalizeUndoState(documents.undo)
        });
        return { ok: false, reason: "conflict" };
      }

      if (currentIndex >= 0) {
        documents.state.tasks.splice(currentIndex, 1);
      }

      if (entry.before) {
        const insertionIndex = Math.min(
          entry.beforeIndex,
          documents.state.tasks.length
        );
        documents.state.tasks.splice(
          insertionIndex,
          0,
          normalizeTask(entry.before)
        );
      }

      documents.state.revision += 1;
      await writeDocuments(documents.state, documents.undo);
      return {
        ok: true,
        label: entry.label,
        task: entry.before ? clone(entry.before) : null
      };
    });
  }

  async function clearUndo() {
    return enqueueMutation(async () => {
      await chrome.storage.local.set({
        [UNDO_KEY]: normalizeUndoState(null)
      });
    });
  }

  globalObject.TabOutTodoService = Object.freeze({
    STORAGE_KEY,
    UNDO_KEY,
    STATE_VERSION,
    MAX_UNDO_ENTRIES,
    normalizeState,
    normalizeUndoState,
    getTaskSourceKey,
    getSnapshot,
    addTask,
    updateTask,
    toggleChecklistItem,
    setTaskCompleted,
    archiveTask,
    restoreTask,
    deleteTask,
    reorderTasks,
    undo,
    clearUndo
  });
})(globalThis);
