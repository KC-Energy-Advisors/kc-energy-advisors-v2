export default function PlainTestPage() {
  return (
    <main style={{
      background: "#111",
      color: "#fff",
      minHeight: "300vh",
      padding: "40px"
    }}>
      <h1>PLAIN TEST PAGE</h1>
      <p>If this page drags on load, the bug is global.</p>

      <div style={{ height: "100vh", border: "2px solid red", marginTop: "24px" }}>
        Block 1
      </div>
      <div style={{ height: "100vh", border: "2px solid blue", marginTop: "24px" }}>
        Block 2
      </div>
      <div style={{ height: "100vh", border: "2px solid green", marginTop: "24px" }}>
        Block 3
      </div>
    </main>
  );
}