
import DeviceDisplay from './DeviceDisplay';

export default async function Page({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  return <DeviceDisplay deviceId={deviceId} />;
}
