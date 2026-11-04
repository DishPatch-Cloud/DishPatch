import axios from "axios";
import { posConfig } from "../config.js";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const backendUrl = posConfig().backendUrl;

export const axiosWrapper = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
  headers: { ...defaultHeader },
});