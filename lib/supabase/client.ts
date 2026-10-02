import {createBrowserClient} from '@supabase/ssr';
//Det här är en funktion som skapar en Supabase-klient med hjälp av miljövariablerna NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Den returnerar en instans av Supabase-klienten som kan användas för att interagera med Supabase-tjänsten.
export function createSupabaseClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}