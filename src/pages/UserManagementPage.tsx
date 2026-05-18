import { useMemo, useState } from "react";

import {
	useDirectusRoles,
	useDirectusUsers,
	useUpdateUserRole,
	type DirectusUserMapped,
} from "@/db/hooks/users";
import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import {
	AlertCircle,
	ChevronDown,
	Lock,
	Shield,
	ShieldAlert,
	ShieldOff,
	Users,
} from "lucide-react";

import { Card } from "@/components/Card";
import { SearchField } from "@/components/SearchField";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/uiStyles";

type DirectusRole = Database["public"]["Tables"]["directus_roles"]["Row"];

const ROLE_HIERARCHY: Record<string, { level: number; color: string; icon: typeof Shield }> = {
	admin: { level: 4, color: "red", icon: ShieldAlert },
	editor: { level: 3, color: "orange", icon: Shield },
	staff: { level: 2, color: "blue", icon: Users },
	viewer: { level: 1, color: "gray", icon: ShieldOff },
};

const getRoleInfo = (roleId: string | null, roles: DirectusRole[]) => {
	if (!roleId) return { name: "No Role", level: 0, color: "gray", icon: ShieldOff };
	const role = roles.find(r => r.id === roleId);
	const roleKey = role?.name?.toLowerCase() || "viewer";
	const info = ROLE_HIERARCHY[roleKey] || { level: 0, color: "gray", icon: ShieldOff };
	return { name: role?.name || "Unknown", ...info };
};

const RoleIcon = ({ icon: Icon, color }: { icon: typeof Shield; color: string }) => {
	const colorClass =
		color === "red"
			? "text-red-600"
			: color === "orange"
				? "text-orange-600"
				: color === "blue"
					? "text-blue-600"
					: "text-gray-600";
	return <Icon className={`w-4 h-4 ${colorClass}`} />;
};

const UserRow = ({
	user,
	roles,
	onRoleChange,
	isChanging,
	currentUserRoleId,
}: {
	user: DirectusUserMapped;
	roles: DirectusRole[];
	onRoleChange: (userId: string, roleId: string | null) => void;
	isChanging: boolean;
	currentUserRoleId: string | null;
}) => {
	const currentRole = getRoleInfo(user.role, roles);
	const currentUserInfo = getRoleInfo(currentUserRoleId, roles);
	const [showDropdown, setShowDropdown] = useState(false);

	const canChangeRole = currentUserInfo.level > currentRole.level;
	return (
		<tr className="border-b border-gray-200 hover:bg-gray-50">
			<td className="px-4 py-3">
				<div>
					<p className="font-medium text-gray-900">
						{user.first_name || user.last_name
							? `${user.first_name || ""} ${user.last_name || ""}`.trim()
							: "Unnamed User"}
					</p>
					<p className="text-sm text-gray-500">{user.email}</p>
				</div>
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					<RoleIcon icon={currentRole.icon} color={currentRole.color} />
					<span className="font-medium text-gray-900">{currentRole.name}</span>
				</div>
			</td>
			<td className="px-4 py-3">
				<span
					className={`inline-block px-2 py-1 rounded text-xs font-medium ${
						user.status_label === "active"
							? "bg-green-50 text-green-700"
							: "bg-gray-50 text-gray-700"
					}`}
				>
					{user.status_label || "active"}
				</span>
			</td>
			<td className="px-4 py-3 text-sm text-gray-500">
				{user.last_access ? new Date(user.last_access).toLocaleDateString() : "Never"}
			</td>
			<td className="px-4 py-3 text-right">
				<div className="relative">
					<button
						onClick={() => setShowDropdown(!showDropdown)}
						disabled={isChanging || !canChangeRole}
						className={`${
							canChangeRole
								? secondaryButtonClassName
								: "px-3 py-1 text-gray-500 bg-gray-50 cursor-not-allowed text-sm rounded"
						} flex items-center gap-2`}
					>
						{!canChangeRole && <Lock className="w-4 h-4" />}
						Change Role
						<ChevronDown className="w-4 h-4" />
					</button>

					{showDropdown && canChangeRole && (
						<div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
							<div className="p-2">
								<p className="text-xs font-semibold text-gray-600 px-2 py-1">
									Select New Role
								</p>
								{roles
									.filter(role => {
										const roleKey = role.name?.toLowerCase() || "";
										const roleLevel = ROLE_HIERARCHY[roleKey]?.level || 0;

										return roleLevel <= currentUserInfo.level;
									})
									.map(role => (
										<button
											key={role.id}
											onClick={() => {
												onRoleChange(user.id, role.id);
												setShowDropdown(false);
											}}
											disabled={isChanging}
											className="w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
										>
											{role.name}
										</button>
									))}
							</div>
						</div>
					)}
				</div>
			</td>
		</tr>
	);
};

export const UserManagementPage = () => {
	const { data: users = [], isLoading: usersLoading } = useDirectusUsers();
	const { data: roles = [], isLoading: rolesLoading } = useDirectusRoles();
	const { data: session, isLoading: sessionLoading } = neon.auth.useSession();
	const updateRole = useUpdateUserRole();

	const [search, setSearch] = useState("");
	const [showWarning, setShowWarning] = useState<{
		userId: string;
		oldRole: string | null;
		newRole: string | null;
	} | null>(null);

	const isLoading = usersLoading || rolesLoading || sessionLoading;

	const currentUser = session?.user;
	const currentUserDirectusRole = users.find(u => u.id === currentUser?.id)?.role || null;
	const currentUserRoleData = roles.find(r => r.id === currentUserDirectusRole);
	const currentUserIsAdmin =
		currentUserRoleData?.name?.toLowerCase() === "admin" || currentUserRoleData?.id === "admin";

	const filtered = useMemo(() => {
		if (!search.trim()) return users;
		const query = search.trim().toLowerCase();
		return users.filter(
			user =>
				(user.first_name || "").toLowerCase().includes(query) ||
				(user.last_name || "").toLowerCase().includes(query) ||
				(user.email || "").toLowerCase().includes(query),
		);
	}, [users, search]);

	const stats = useMemo(
		() => ({
			totalUsers: users.length,
			activeUsers: users.filter(u => u.status_label === "active").length,
			admins: users.filter(u => {
				const role = roles.find(r => r.id === u.role);
				return role?.name?.toLowerCase() === "admin";
			}).length,
			editors: users.filter(u => {
				const role = roles.find(r => r.id === u.role);
				return role?.name?.toLowerCase() === "editor";
			}).length,
		}),
		[users, roles],
	);

	const handleRoleChange = (userId: string, newRoleId: string | null) => {
		const user = users.find(u => u.id === userId);
		setShowWarning({ userId, oldRole: user?.role || null, newRole: newRoleId });
	};

	const confirmRoleChange = async () => {
		if (!showWarning) return;

		try {
			await updateRole.mutateAsync({
				userId: showWarning.userId,
				roleId: showWarning.newRole,
			});
			setShowWarning(null);
		} catch (error) {
			console.error("Failed to update user role:", error);
		}
	};

	if (!currentUserIsAdmin) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Card className="p-8 text-center max-w-md">
					<ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
					<p className="text-gray-600">
						Only administrators can access the user management page.
					</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Warning Modal */}
			{showWarning && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<Card className="p-6 max-w-md">
						<div className="flex items-center gap-3 mb-4">
							<AlertCircle className="w-6 h-6 text-orange-600" />
							<h3 className="text-lg font-bold text-gray-900">Confirm Role Change</h3>
						</div>

						<p className="text-gray-600 mb-4">
							You are about to change a user&apos;s role. This action affects their
							access permissions across the entire system.
						</p>

						<div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
							<p className="text-sm text-gray-600 mb-2">
								<strong>Old Role:</strong>{" "}
								{getRoleInfo(showWarning.oldRole, roles).name}
							</p>
							<p className="text-sm text-gray-600">
								<strong>New Role:</strong>{" "}
								{getRoleInfo(showWarning.newRole, roles).name}
							</p>
						</div>

						<p className="text-xs text-gray-500 mb-6">
							This change will be recorded and logged for audit purposes.
						</p>

						<div className="flex gap-3">
							<button
								onClick={() => setShowWarning(null)}
								className={secondaryButtonClassName}
							>
								Cancel
							</button>
							<button
								onClick={confirmRoleChange}
								disabled={updateRole.isPending}
								className={primaryButtonClassName}
							>
								{updateRole.isPending ? "Updating..." : "Confirm"}
							</button>
						</div>
					</Card>
				</div>
			)}

			{/* Header */}
			<div>
				<SectionTitle title="User Management" />
				<p className="text-gray-600 mt-2">
					Manage user roles and permissions. Only admins can promote or demote other
					users.
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
				<StatCard
					icon={Shield}
					label="Active Users"
					value={stats.activeUsers}
					color="green"
				/>
				<StatCard
					icon={ShieldAlert}
					label="Administrators"
					value={stats.admins}
					color="red"
				/>
				<StatCard icon={Users} label="Editors" value={stats.editors} color="orange" />
			</div>

			{/* Role Hierarchy Info */}
			<Card className="p-4 bg-blue-50 border border-blue-200">
				<div className="flex gap-2 mb-3">
					<Shield className="w-5 h-5 text-blue-600 shrink-0" />
					<h3 className="font-semibold text-blue-900">Role Hierarchy</h3>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
					<div>
						<span className="font-medium">Admin</span>
						<p className="text-xs">Full system access & user management</p>
					</div>
					<div>
						<span className="font-medium">Editor</span>
						<p className="text-xs">Create and edit conference content</p>
					</div>
					<div>
						<span className="font-medium">Staff</span>
						<p className="text-xs">Day-to-day operations & check-ins</p>
					</div>
					<div>
						<span className="font-medium">Viewer</span>
						<p className="text-xs">View-only access to reports</p>
					</div>
				</div>
			</Card>

			{/* Users Table */}
			<Card className="overflow-hidden">
				<div className="p-4 border-b border-gray-200">
					<SearchField
						placeholder="Search by name or email..."
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>

				{isLoading ? (
					<div className="p-8 text-center text-gray-500">Loading users...</div>
				) : filtered.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						{search.trim() ? "No users found matching your search." : "No users found."}
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
									User
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
									Role
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
									Status
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
									Last Access
								</th>
								<th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
									Action
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map(user => (
								<UserRow
									key={user.id}
									user={user}
									roles={roles}
									onRoleChange={handleRoleChange}
									isChanging={updateRole.isPending}
									currentUserRoleId={currentUserDirectusRole}
								/>
							))}
						</tbody>
					</table>
				)}
			</Card>

			{/* Info Box */}
			<Card className="p-4 bg-blue-50 border border-blue-200">
				<div className="flex gap-2">
					<AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
					<div className="text-sm text-blue-800">
						<p className="font-semibold mb-1">Important Information</p>
						<ul className="list-disc list-inside space-y-1 text-xs">
							<li>You can only assign roles that are at your level or lower</li>
							<li>All role changes are logged for audit purposes</li>
							<li>Users must log out and back in to see permission changes</li>
							<li>
								Promote at least one other admin before removing your admin access
							</li>
						</ul>
					</div>
				</div>
			</Card>
		</div>
	);
};
