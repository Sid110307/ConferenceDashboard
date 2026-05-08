import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

const UUID_SECTION_LENGTH = 8;

export const ConferenceUUIDPicker = () => {
	const navigate = useNavigate();
	const [values, setValues] = useState<string[]>(new Array(UUID_SECTION_LENGTH).fill(""));
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const [error, setError] = useState("");

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
			handleSubmit();
		}
	};

	const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text");

		if (!/^[a-zA-Z0-9]*$/.test(pastedText)) {
			setError("Invalid UUID format");
			return;
		}

		applyCharacters(index, pastedText);
	};

	const handleSubmit = () => {
		const uuid = values.join("");

		if (values.some(value => value === "")) {
			setError("Please enter all 8 characters");
			return;
		}

		navigate(`/c/${uuid}`, { replace: true });
	};

	const isFilled = values.every(value => value !== "");
	return (
		<div className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-gray-50 p-4 text-zinc-900 lg:p-6">
			<Card className="w-full max-w-lg p-6 shadow-sm sm:p-8">
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
							className="h-12 w-11 rounded-lg border border-gray-200 bg-white text-center text-lg font-semibold text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-gray-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:h-14 sm:w-12 sm:text-xl"
							placeholder="0"
							aria-label={`Conference ID character ${index + 1}`}
							autoComplete="off"
						/>
					))}
				</div>
				{error && (
					<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
						{error}
					</div>
				)}
				<button
					onClick={handleSubmit}
					disabled={!isFilled}
					className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
						isFilled
							? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]"
							: "cursor-not-allowed bg-gray-200 text-gray-500"
					}`}
				>
					Continue to Conference
				</button>

				<p className="mt-6 text-center text-xs text-zinc-500">
					Example: <span className="font-mono text-zinc-700">a1b2c3d4</span>
				</p>
			</Card>
		</div>
	);
};
