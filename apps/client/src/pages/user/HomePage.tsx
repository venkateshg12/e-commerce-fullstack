import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/auth/useLogout";


const HomePage = () => {
  const { mutate: logout, isPending } = useLogout();
  return (
    <div>
      Welcome to home page!
      <Button
        onClick={() => logout()}
        disabled={isPending}
      >
        Logout
      </Button>
    </div>
  )
}

export default HomePage;
