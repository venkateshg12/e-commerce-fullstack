import { API_URL } from "@/constants/env";
import axios from "axios"

const options = {
    baseURL: API_URL,
    withCredentials: true,
}

const API = axios.create(options);
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 500,
        message: "Network error. Please check your internet connection.",
      });
    }

    const { status, data } = error.response;

    return Promise.reject({
      status,
      ...data,
    });
  }
);
export default API;