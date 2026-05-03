import React, { useEffect, useRef } from "react";
import { useCountUp } from "react-countup";

interface CountUpNumberProps {
	value: number;
	duration?: number;
	separator?: string;
	decimals?: number;
	suffix?: string;
	prefix?: string;
	className?: string;
}

export const CountUpNumber = ({
	value,
	duration = 2,
	separator = ",",
	decimals = 0,
	suffix = "",
	prefix = "",
	className = "",
}: CountUpNumberProps) => {
	const countUpRef = useRef<HTMLSpanElement | null>(null);
	const { update } = useCountUp({
		ref: countUpRef as React.RefObject<HTMLSpanElement>,
		end: value,
		duration,
		separator,
		decimals,
		suffix,
		prefix,
	});

	useEffect(() => {
		update(value);
	}, [value, update]);

	return <span ref={countUpRef} className={className} />;
};
