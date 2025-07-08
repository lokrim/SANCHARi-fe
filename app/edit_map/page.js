import { getUsernameFromCookie } from "@/lib/auth";
import EditMapPageClient from "./EditMapPageClient";
import { MapToolProvider } from "../context/MapToolContext";

export default async function EditMapPage() {
    const username = await getUsernameFromCookie();

    return (
        <MapToolProvider>
            <EditMapPageClient username={username} />
        </MapToolProvider>
    );
}