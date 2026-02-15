'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  createCollaborationRoom,
  listCollaborationRooms,
  listRoomMessages,
  postRoomMessage,
  subscribeToRoomMessages,
  type CollaborationMessageRow,
  type CollaborationRoomRow
} from '@/lib/supabaseClient';

export default function CollaborationRoomPanel() {
  const { profile, session } = useAuth();

  const [rooms, setRooms] = useState<CollaborationRoomRow[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [messages, setMessages] = useState<CollaborationMessageRow[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [status, setStatus] = useState('');

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data, error } = await listCollaborationRooms();
    if (error) {
      setStatus(error.message);
      setLoadingRooms(false);
      return;
    }

    const nextRooms = data ?? [];
    setRooms(nextRooms);
    setSelectedRoomId((current) => {
      if (current && nextRooms.some((room) => room.id === current)) {
        return current;
      }
      return nextRooms[0]?.id ?? '';
    });
    setLoadingRooms(false);
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    const { data, error } = await listRoomMessages(roomId);
    if (error) {
      setStatus(error.message);
      return;
    }

    setMessages(data ?? []);
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedRoomId);
    const channel = subscribeToRoomMessages(selectedRoomId, (payload) => {
      const nextMessage = payload.new as CollaborationMessageRow | undefined;
      if (!nextMessage || nextMessage.room_id !== selectedRoomId) {
        return;
      }

      setMessages((current) => {
        if (current.some((message) => message.id === nextMessage.id)) {
          return current;
        }
        return [...current, nextMessage];
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [loadMessages, selectedRoomId]);

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user.id) {
      setStatus('Login required.');
      return;
    }

    const { data, error } = await createCollaborationRoom({
      created_by: session.user.id,
      name: newRoomName
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setNewRoomName('');
    setStatus(`Room created: ${data?.name ?? 'new room'}`);
    await loadRooms();
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user.id || !selectedRoomId) {
      setStatus('Select a room first.');
      return;
    }

    const { error } = await postRoomMessage({
      author_id: session.user.id,
      author_name: profile?.display_name || session.user.email?.split('@')[0] || 'member',
      message: newMessage,
      room_id: selectedRoomId
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setNewMessage('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="panel space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Rooms</h2>
          <p className="text-sm text-slate-300">Create focused collaboration spaces for sessions.</p>
        </div>

        <form className="space-y-2" onSubmit={handleCreateRoom}>
          <input
            type="text"
            required
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder="New room name"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cyan/80"
          >
            Create Room
          </button>
        </form>

        <div className="space-y-2">
          {loadingRooms ? (
            <p className="text-sm text-slate-300">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-slate-300">No rooms yet.</p>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedRoomId === room.id
                    ? 'border-cyan/60 bg-cyan/15 text-cyan'
                    : 'border-white/15 bg-black/25 text-slate-100 hover:bg-white/10'
                }`}
              >
                <p className="font-medium">{room.name}</p>
                <p className="text-xs text-slate-400">
                  Updated {new Date(room.updated_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="panel flex min-h-[460px] flex-col p-4">
        <div className="border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold text-slate-100">
            {selectedRoom ? selectedRoom.name : 'Select a room'}
          </h2>
          <p className="text-sm text-slate-300">Realtime message thread for arrangement notes and handoffs.</p>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-300">No messages yet.</p>
          ) : (
            messages.map((message) => (
              <article key={message.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-cyan">{message.author_name}</p>
                  <p className="text-xs text-slate-400">{new Date(message.created_at).toLocaleString()}</p>
                </div>
                <p className="text-sm text-slate-100">{message.message}</p>
              </article>
            ))
          )}
        </div>

        <form className="mt-4 flex gap-2 border-t border-white/10 pt-3" onSubmit={handleSendMessage}>
          <input
            type="text"
            required
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="Share arrangement note..."
            className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={!selectedRoomId}
            className="rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {status ? <p className="mt-3 text-xs text-cyan">{status}</p> : null}
      </section>
    </div>
  );
}
