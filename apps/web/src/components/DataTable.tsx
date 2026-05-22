import { type Key, type ReactNode } from "react";

import { cx, table } from "@/lib/uiStyles";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/Button";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";

export type Column<T> = {
	key: string;
	header: ReactNode;
	cell: (row: T) => ReactNode;
	align?: "left" | "right" | "center";
	width?: string;
	className?: string;
};

export function DataTable<T extends { id?: string | number }>(props: {
	columns: Column<T>[];
	rows: T[];
	loading?: boolean;
	rowKey?: (row: T) => Key;
	onRowClick?: (row: T) => void;
	selectedKey?: Key | null;
	emptyTitle?: ReactNode;
	emptyHint?: ReactNode;
	className?: string;
}) {
	const {
		columns,
		rows,
		loading,
		rowKey,
		onRowClick,
		selectedKey,
		emptyTitle,
		emptyHint,
		className,
	} = props;

	const getKey = (r: T): Key => {
		if (rowKey) return rowKey(r);
		if (r.id != null) return r.id as Key;
		return JSON.stringify(r);
	};

	return (
		<div className={cx(table.wrap, className)}>
			<div className={table.scroll}>
				<table className={table.root}>
					<thead className={table.head}>
						<tr>
							{columns.map(c => (
								<th
									key={c.key}
									className={cx(
										table.headCell,
										c.width,
										c.align === "right" && "text-right",
										c.align === "center" && "text-center",
									)}
								>
									{c.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td colSpan={columns.length}>
									<CenterSpinner />
								</td>
							</tr>
						)}
						{!loading &&
							rows.map(r => {
								const k = getKey(r);
								const selected = selectedKey != null && k === selectedKey;
								return (
									<tr
										key={k}
										onClick={onRowClick ? () => onRowClick(r) : undefined}
										className={cx(
											table.row,
											onRowClick && "cursor-pointer",
											selected && table.rowSelected,
										)}
									>
										{columns.map(c => (
											<td
												key={c.key}
												className={cx(
													table.cell,
													c.align === "right" &&
														"text-right tabular-nums",
													c.align === "center" && "text-center",
													c.className,
												)}
											>
												{c.cell(r)}
											</td>
										))}
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>
			{!loading && rows.length === 0 && (
				<div className="p-3">
					<EmptyState title={emptyTitle ?? "No records"} hint={emptyHint} />
				</div>
			)}
		</div>
	);
}

export function Pagination({
	page,
	pageSize,
	total,
	onChange,
}: {
	page: number;
	pageSize: number;
	total: number;
	onChange: (page: number) => void;
}) {
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);
	return (
		<div className="flex items-center justify-between gap-2 mt-3">
			<div className="text-xs text-ink-3 tabular-nums">
				{total === 0 ? "0 records" : `${from}-${to} of ${total}`}
			</div>
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					disabled={page <= 1}
					onClick={() => onChange(page - 1)}
					leadingIcon={<ChevronLeft size={14} />}
				>
					Prev
				</Button>
				<div className="text-xs text-ink-2 px-1 tabular-nums">
					{page} / {lastPage}
				</div>
				<Button
					variant="ghost"
					size="sm"
					disabled={page >= lastPage}
					onClick={() => onChange(page + 1)}
					trailingIcon={<ChevronRight size={14} />}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
