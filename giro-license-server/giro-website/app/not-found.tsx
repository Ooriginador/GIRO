export default function NotFound() {
  console.log("[TRACE] Custom 404 Rendering");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white">
      <h1 className="text-4xl font-bold">CUSTOM 404 PAGE</h1>
      <p>The requested resource could not be found.</p>
    </div>
  );
}
