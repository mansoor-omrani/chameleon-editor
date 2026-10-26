import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");

  async function handleGreet() {
    try {
      const response = await invoke("greet", { name: name || "World" });
      setGreeting(response);
    } catch (error) {
      console.error(error);
      setGreeting("خطا در فراخوانی بک‌اند: " + error);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Chameleon Editor</h1>
      <p>پروژهٔ اولیهٔ Tauri + React (JavaScript)</p>

      <div style={{ marginTop: "1.5rem", maxWidth: "400px" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          نام خود را وارد کنید:
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: علی"
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        <button
          onClick={handleGreet}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          نمایش Hello World از Rust
        </button>

        {greeting && (
          <p style={{ marginTop: "1rem", color: "green", fontWeight: "bold" }}>
            {greeting}
          </p>
        )}
      </div>
    </main>
  );
}

export default App;