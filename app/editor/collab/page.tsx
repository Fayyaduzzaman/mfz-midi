import CollaborationRoomPanel from '@/components/CollaborationRoomPanel';

export default function CollaborationPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">Collaboration Rooms</h1>
      <p className="text-sm text-slate-300">
        Create shared rooms for live coordination, notes, and arrangement decisions.
      </p>
      <CollaborationRoomPanel />
    </section>
  );
}
