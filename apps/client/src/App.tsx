import { useState } from "react";
import { Button } from "./components/ui/button";
import Signin from "./pages/auth/Signin";
import Signup from "./pages/auth/Signup";
import "./utils/fonts";


function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1 className="font-lato">Hello world</h1>
      {/* <Button className="rounded-md bg-red-400" variant={"default"}>Hello world</Button> */}
      <Signin />
      <Signup />
    </>
  );
}

export default App;
