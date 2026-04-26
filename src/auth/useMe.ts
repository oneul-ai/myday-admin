import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api/admins";
import { useAuth } from "./AuthContext";

export function useMe() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
