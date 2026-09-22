import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import {
  addContact,
  getContacts,
  searchUsers,
} from "../services/contactService";

export default function Contacts() {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<any[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>(
    []
  );

  useEffect(() => {
    if (!user) return;

    loadContacts();
  }, [user]);

  async function loadContacts() {
    if (!user) return;

    const data = await getContacts(user.uid);

    setContacts(data);
  }

  async function handleSearch() {
    if (!search.trim()) return;

    const data = await searchUsers(
      search.trim()
    );

    setResults(data);
  }

  async function handleAddContact(
    contact: any
  ) {
    if (!user) return;

    await addContact(user.uid, {
      uid: contact.id,
      name: contact.name,
      email: contact.email,
    });

    await loadContacts();

    setResults([]);
    setSearch("");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          Contacts
        </h1>

        {/* Search */}
        <div className="flex gap-3 mb-8">

          <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4">

            <Search
              size={20}
              className="text-slate-500"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search by email..."
              className="flex-1 bg-transparent outline-none px-3 py-3"
            />

          </div>

          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-500 px-5 rounded-xl"
          >
            Search
          </button>

        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mb-8">

            <h2 className="text-sm text-slate-500 mb-3">
              Search results
            </h2>

            {results.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-2"
              >

                <div>
                  <p className="font-semibold">
                    {contact.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {contact.email}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleAddContact(contact)
                  }
                  className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500"
                >
                  <UserPlus size={18} />
                </button>

              </div>
            ))}

          </div>
        )}

        {/* Contacts */}
        <h2 className="text-sm text-slate-500 mb-3">
          My contacts
        </h2>

        <div className="space-y-2">

          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >

              <p className="font-semibold">
                {contact.name}
              </p>

              <p className="text-sm text-slate-500">
                {contact.email}
              </p>

            </div>
          ))}

          {contacts.length === 0 && (
            <p className="text-slate-500">
              No contacts yet.
            </p>
          )}

        </div>

      </div>

    </div>
  );
}