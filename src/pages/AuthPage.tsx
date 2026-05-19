import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export const AuthPage = () => (
	<div className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-gray-50 p-4">
		<div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
			<AuthView path="sign-in" />
		</div>
	</div>
);
