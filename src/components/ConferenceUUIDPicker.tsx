import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";

import { neon } from "@/db/neon";
import { LogOut } from "lucide-react";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

const UUID_SECTION_LENGTH = 8;

export const ConferenceUUIDPicker = () => {
	const navigate = useNavigate();
	const { data: session, isPending } = neon.auth.useSession();

	const [values, setValues] = useState<string[]>(new Array(UUID_SECTION_LENGTH).fill(""));
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const [error, setError] = useState("");
	const [isChecking, setIsChecking] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const applyCharacters = (startIndex: number, text: string) => {
		const chars = text
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "")
			.slice(0, UUID_SECTION_LENGTH - startIndex)
			.split("");

		const newValues = [...values];
		chars.forEach((char, offset) => {
			newValues[startIndex + offset] = char;
		});
		setValues(newValues);
		setError("");

		const nextIndex = Math.min(startIndex + chars.length, UUID_SECTION_LENGTH - 1);
		if (chars.length > 0) {
			inputRefs.current[nextIndex]?.focus();
		}
	};

	const handleChange = (index: number, char: string) => {
		if (char === "") {
			const newValues = [...values];
			newValues[index] = "";
			setValues(newValues);
			setError("");
			return;
		}

		applyCharacters(index, char);
	};

	const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace") {
			e.preventDefault();
			const newValues = [...values];

			if (newValues[index]) {
				newValues[index] = "";
				setValues(newValues);
			} else if (index > 0) {
				newValues[index - 1] = "";
				setValues(newValues);
				inputRefs.current[index - 1]?.focus();
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			inputRefs.current[index - 1]?.focus();
		} else if (e.key === "ArrowRight" && index < UUID_SECTION_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		} else if (e.key === "Enter") {
			void handleSubmit();
		}
	};

	const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text");

		if (!/^[a-zA-Z0-9-]*$/.test(pastedText)) {
			setError("Invalid conference ID format");
			return;
		}

		applyCharacters(index, pastedText);
	};

	const handleSubmit = async () => {
		const enteredId = values.join("");

		if (values.some(value => value === "")) {
			setError("Please enter all 8 characters");
			return;
		}

		setIsChecking(true);
		setError("");

		try {
			const { data, error } = await neon.rpc("lookup_conference_by_short_code", {
				p_short_code: enteredId,
			});

			if (error) {
				throw error;
			}

			if (!data || data.length === 0) {
				setError("No conference found with this ID");
				return;
			}

			navigate(`/c/${data[0].id}`, { replace: true });
		} catch {
			setError("Could not check conference ID. Please try again.");
		} finally {
			setIsChecking(false);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await neon.auth.signOut();
		} catch {
			console.error("Logout failed");
		} finally {
			setIsLoggingOut(false);
		}
	};

	const isFilled = values.every(value => value !== "");
	const canContinue = isFilled && !isChecking;

	return isPending ? null : !session?.user ? (
		<div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 p-4 gap-8">
			<Card className="w-full max-w-md p-6 text-center flex flex-col justify-center gap-6">
				<SectionTitle title="Welcome to Conference Dashboard" />
				<SectionTitle
					title="Sign in required"
					subtitle="Please sign in before entering a conference code."
				/>
				<button
					onClick={() => navigate("/auth")}
					className="w-full rounded-md cursor-pointer bg-blue-600! px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700!"
				>
					Sign in
				</button>
			</Card>
		</div>
	) : (
		<div className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-gray-50 p-4 text-zinc-900 lg:p-6">
			<Card className="w-full max-w-lg p-6 shadow-sm sm:p-8 flex flex-col items-center gap-6">
				<SectionTitle
					title="Enter Conference"
					subtitle="Use the first 8 characters of your conference ID to continue."
				/>
				<div className="mb-6 flex justify-center gap-2 sm:gap-2.5">
					{values.map((value, index) => (
						<input
							key={index}
							ref={el => {
								inputRefs.current[index] = el;
							}}
							type="text"
							inputMode="text"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							pattern="[a-zA-Z0-9]*"
							maxLength={1}
							value={value}
							onChange={e => handleChange(index, e.target.value)}
							onKeyDown={e => handleKeyDown(index, e)}
							onPaste={e => handlePaste(index, e)}
							className="h-12 w-11 rounded-md border border-gray-200 bg-white text-center text-lg font-semibold text-zinc-900 shadow-sm transition-all placeholder:text-zinc-300 hover:border-gray-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:h-14 sm:w-12 sm:text-xl"
							placeholder="0"
							aria-label={`Conference ID character ${index + 1}`}
							autoComplete="off"
						/>
					))}
				</div>
				{error && (
					<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
						{error}
					</div>
				)}
				<button
					type="button"
					onClick={() => void handleSubmit()}
					disabled={!canContinue}
					className={[
						"flex w-full items-center justify-center rounded-md border px-4 py-3 text-sm font-semibold shadow-sm transition-all",
						canContinue
							? "cursor-pointer border-blue-700! bg-blue-600! text-white hover:bg-blue-700! active:scale-[0.99]"
							: "cursor-not-allowed border-gray-200 bg-gray-100 text-zinc-400 opacity-100",
					].join(" ")}
				>
					{isChecking ? "Checking..." : "Continue to Conference"}
				</button>

				<div className="flex items-center gap-2 mt-4 w-full">
					<p className="text-xs text-zinc-500 text-center flex-1">
						Example: <span className="font-mono text-zinc-700">a1b2c3d4</span>
					</p>
					<button
						onClick={() => void handleLogout()}
						disabled={isLoggingOut}
						className="flex items-center justify-center gap-2 rounded-md cursor-pointer px-4 py-2 text-xs font-semibold transition-all border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoggingOut ? (
							<>
								<div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
								Logging out...
							</>
						) : (
							<>
								<LogOut size={14} />
								Log out
							</>
						)}
					</button>
				</div>
			</Card>
			<div className="absolute bottom-4 text-center w-full">
				<p className="text-xs text-zinc-500">
					Logged in as{" "}
					<span className="font-mono text-zinc-700">{session.user.email}</span>
				</p>
			</div>
		</div>
	);
};
