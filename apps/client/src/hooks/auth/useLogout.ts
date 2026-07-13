import { logout } from "@/api/auth"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

export const useLogout = () => {
    const navigate  = useNavigate();
    return useMutation({
        mutationFn : logout,
        onSuccess:() => {
            navigate("/", {replace : true});
        }
    })
}