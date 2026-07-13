import { register } from "@/api/auth"
import type { FailureResponse,  RegisterResponse,  SuccessResponse } from "@/lib/types"
import type { RegisterSchema } from "@repo/types"
import { useMutation } from "@tanstack/react-query"


export const useRegister = () => {
    return useMutation<
    SuccessResponse<RegisterResponse>, // onSuccess receives this
    FailureResponse,                  // onError receives this
    RegisterSchema                     // mutate() accepts this  
    >({
        mutationFn : register
    })
}