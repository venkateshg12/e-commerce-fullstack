import { API_URL } from "./env"


export const LoadingDots = () => {

    return (
        <>
            <div className="flex space-x-1 justify-center items-center">
                <div className='dotAnimation1 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation2 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation3 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation4 text-white rounded-full animate-pulse text-2xl'>•</div>
            </div>
        </>
    )

}

export const handleGoogleAuthenticatoin = () => {
    window.location.href = `${API_URL}/auth/google`;
}