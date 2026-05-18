import { useParams } from "react-router";





export const useRouteParams = () => {
	const params = useParams();
	return {
		id: params.id,
		day: params.day ? parseInt(params.day) : undefined,
	};
};
