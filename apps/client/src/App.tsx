import { RouterProvider } from "react-router-dom";
import "./utils/fonts";
import AuthLoader from "./components/auth/AuthLoader";
import { router } from "./router";

function App() {
  return (
    <AuthLoader>
      <RouterProvider router={router} />
    </AuthLoader>
  );
}

export default App;
