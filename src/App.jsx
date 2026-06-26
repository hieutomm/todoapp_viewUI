import { useEffect, useMemo, useState } from "react";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./services/todoService";
import "./App.css";

const MAX_TITLE_LENGTH = 80;
const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang làm" },
  { value: "completed", label: "Hoàn thành" },
];

function getDisplayName(user) {
  return (
    user?.signInDetails?.loginId ||
    user?.username ||
    user?.attributes?.email ||
    "Người dùng"
  );
}

function getInitials(name) {
  return name
    .split(/[.@_\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function validateTitle(value, todos) {
  const title = value.trim();

  if (!title) {
    return "Vui lòng nhập tên công việc.";
  }

  if (title.length < 3) {
    return "Cong viec can it nhat 3 ky tu.";
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return `Cong viec khong qua ${MAX_TITLE_LENGTH} ky tu.`;
  }

  const duplicated = todos.some(
    (todo) => todo.title.trim().toLowerCase() === title.toLowerCase(),
  );

  if (duplicated) {
    return "Công việc đã tồn tại";
  }

  return "";
}

function normalizeTodos(data) {
  return data
    .map((todo) => ({ ...todo, done: todo.done ?? false }))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();

      return bTime - aTime;
    });
}

function TodoApp({ user, signOut }) {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [notice, setNotice] = useState(null);

  const displayName = getDisplayName(user);
  const titleError = touched ? validateTitle(title, todos) : "";
  const completedCount = todos.filter((todo) => todo.done).length;
  const activeCount = todos.length - completedCount;
  const completionRate = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0;

  const filteredTodos = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return todos.filter((todo) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !todo.done) ||
        (filter === "completed" && todo.done);
      const matchesQuery = todo.title.toLowerCase().includes(keyword);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, todos]);

  async function loadTodos() {
    setIsLoading(true);
    setNotice(null);

    try {
      const data = await getTodos();
      setTodos(normalizeTodos(data));
    } catch (err) {
      console.error(err);
      setNotice({
        type: "error",
        message: "Không thể tải danh sách công việc. Mời thử lại",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTodos() {
      try {
        const data = await getTodos();

        if (isMounted) {
          setTodos(normalizeTodos(data));
        }
      } catch (err) {
        console.error(err);

        if (isMounted) {
          setNotice({
            type: "error",
            message: "Không thể tải danh sách công việc. Mời thử lại",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    setTouched(true);

    const error = validateTitle(title, todos);

    if (error) {
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const createdTodo = await createTodo(title.trim());

      setTodos((currentTodos) =>
        normalizeTodos([createdTodo, ...currentTodos].filter(Boolean)),
      );
      setTitle("");
      setTouched(false);
      setNotice({ type: "success", message: "Đã thêm công việc mới" });
    } catch (err) {
      console.error(err);
      setNotice({
        type: "error",
        message: "Thêm công việc thất bại. Thử lại",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(todo) {
    setUpdatingId(todo.id);
    setNotice(null);

    const nextDone = !todo.done;
    const previousTodos = todos;

    setTodos((currentTodos) =>
      currentTodos.map((item) =>
        item.id === todo.id ? { ...item, done: nextDone } : item,
      ),
    );

    try {
      await updateTodo(todo.id, nextDone);
      setNotice({
        type: "success",
        message: nextDone ? "Đã đánh dấu hoàn thành" : "Đã mở lại công việc.",
      });
    } catch (err) {
      console.error(err);
      setTodos(previousTodos);
      setNotice({
        type: "error",
        message: "Cập nhật trạng thái thất bại.",
      });
    } finally {
      setUpdatingId("");
    }
  }

  async function handleDelete(todo) {
    setDeletingId(todo.id);
    setNotice(null);

    const previousTodos = todos;
    setTodos((currentTodos) =>
      currentTodos.filter((item) => item.id !== todo.id),
    );

    try {
      await deleteTodo(todo.id);
      setNotice({ type: "success", message: "Đã xóa công việc." });
    } catch (err) {
      console.error(err);
      setTodos(previousTodos);
      setNotice({
        type: "error",
        message: "Xóa công việc thất bại.",
      });
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Thong tin nguoi dung">
        <div className="brand">
          <span className="brand-mark">T</span>
          <div>
            <p className="eyebrow">Todo</p>
            <h1>Daily Tasks</h1>
          </div>
        </div>

        <section className="profile-card">
          <div className="avatar" aria-hidden="true">
            {getInitials(displayName) || "U"}
          </div>
          <div>
            <p className="profile-label">Dang dang nhap</p>
            <h2>{displayName}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={signOut}>
            Logout
          </button>
        </section>

        <section className="summary-card" aria-label="Thong ke cong viec">
          <div>
            <span>Tiến độ công việc</span>
            <strong>{completionRate}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${completionRate}%` }} />
          </div>
          <dl className="summary-grid">
            <div>
              <dt>Tất cả</dt>
              <dd>{todos.length}</dd>
            </div>
            <div>
              <dt>Đang làm</dt>
              <dd>{activeCount}</dd>
            </div>
            <div>
              <dt>Hoàn thành </dt>
              <dd>{completedCount}</dd>
            </div>
          </dl>
        </section>
      </aside>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Quản lý công việc</p>
            <h2>Hãy lên kế hoạch trong ngày của bạn nhé!</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={loadTodos}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <form className="task-form" onSubmit={handleAdd} noValidate>
          <label htmlFor="task-title">Thêm công việc</label>
          <div className="input-row">
            <input
              id="task-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="VD: đi ngủ..."
              aria-invalid={Boolean(titleError)}
              aria-describedby="task-title-help"
              onBlur={() => setTouched(true)}
              onChange={(event) => {
                setTitle(event.target.value);
                setTouched(true);
              }}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang thêm..." : "Thêm"}
            </button>
          </div>
          <div className="form-meta" id="task-title-help">
            <span className={titleError ? "field-error" : ""}>
              {titleError ||
                "Nhập từ 3 đến 80 ký tự, không trùng task đã tồn tại"}
            </span>
            <span>
              {title.trim().length}/{MAX_TITLE_LENGTH}
            </span>
          </div>
        </form>

        {notice && (
          <div className={`notice ${notice.type}`} role="status">
            {notice.message}
          </div>
        )}

        <div className="toolbar">
          <div className="filter-group" aria-label="Loc cong viec">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                className={filter === item.value ? "active" : ""}
                type="button"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span>Tìm kiếm</span>
            <input
              value={query}
              placeholder="Nhập từ khóa..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <section className="task-list" aria-label="Danh sach cong viec">
          {isLoading ? (
            <div className="empty-state">Loading...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="empty-state">
              <strong>Chưa thấy công việc phù hợp</strong>
              <span>Thêm task mới hoặc thay đổi bộ lọc</span>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <article
                className={`task-item ${todo.done ? "done" : ""}`}
                key={todo.id}
              >
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={Boolean(todo.done)}
                    disabled={updatingId === todo.id || deletingId === todo.id}
                    onChange={() => handleToggle(todo)}
                  />
                  <span />
                </label>

                <div className="task-content">
                  <h3>{todo.title}</h3>
                  <p>{todo.done ? "Đã hoành thành" : "Đang thực hiện"}</p>
                </div>

                <div className="task-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={updatingId === todo.id || deletingId === todo.id}
                    onClick={() => handleToggle(todo)}
                  >
                    {updatingId === todo.id
                      ? "Saving..."
                      : todo.done
                        ? "Mở lại"
                        : "Xong"}
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={deletingId === todo.id}
                    onClick={() => handleDelete(todo)}
                  >
                    {deletingId === todo.id ? "Deleting..." : "Xóa"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function App() {
  return (
    <Authenticator>
      {({ user, signOut }) => <TodoApp user={user} signOut={signOut} />}
    </Authenticator>
  );
}

export default App;
