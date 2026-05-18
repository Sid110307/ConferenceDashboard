import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type DirectusUser = Database["public"]["Tables"]["directus_users"]["Row"];
type DirectusUserUpdate = Database["public"]["Tables"]["directus_users"]["Update"];
type DirectusRole = Database["public"]["Tables"]["directus_roles"]["Row"];

type DirectusUserRawWithRelations = DirectusUser & {
	role_rel: DirectusRole | null;
};

export type DirectusUserMapped = Omit<DirectusUser, "role"> & {
	roleData: DirectusRole | null;
};

export const DIRECTUS_USER_SELECT = `
  *,
  role_rel:role(*)
`;

const mapDirectusUser = createRelationMapper<DirectusUserRawWithRelations, DirectusUserMapped>({
	role_rel: "roleData",
});

const stripDirectusUserRelations = createRelationStripper<DirectusUserUpdate>(["role_rel"]);

export const useDirectusUsers = () => {
	return useQuery({
		queryKey: ["directus_users"],
		queryFn: async () => {
			const { data, error } = await neon
				.from("directus_users")
				.select(DIRECTUS_USER_SELECT)
				.order("email", { ascending: true });

			if (error) throw error;

			return ((data ?? []) as DirectusUserRawWithRelations[]).map(mapDirectusUser);
		},
		staleTime: 30000,
	});
};

export const useDirectusRoles = () => {
	return useQuery({
		queryKey: ["directus_roles"],
		queryFn: async () => {
			const { data, error } = await neon
				.from("directus_roles")
				.select("*")
				.order("name", { ascending: true });

			if (error) throw error;

			return (data ?? []) as DirectusRole[];
		},
		staleTime: 60000,
	});
};

export const useUpdateUserRole = () => {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: async ({ userId, roleId }: { userId: string; roleId: string | null }) => {
			const { data, error } = await neon
				.from("directus_users")
				.update({ role: roleId } as DirectusUserUpdate)
				.eq("id", userId)
				.select(DIRECTUS_USER_SELECT)
				.single();

			if (error) throw error;

			return mapDirectusUser(data as DirectusUserRawWithRelations);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["directus_users"] });
		},
	});
};

export const useUpdateUserStatus = () => {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
			const { data, error } = await neon
				.from("directus_users")
				.update({ status } as DirectusUserUpdate)
				.eq("id", userId)
				.select(DIRECTUS_USER_SELECT)
				.single();

			if (error) throw error;

			return mapDirectusUser(data as DirectusUserRawWithRelations);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["directus_users"] });
		},
	});
};
