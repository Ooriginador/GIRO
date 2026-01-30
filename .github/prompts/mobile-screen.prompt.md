# Mobile Screen Creation

Create a new Expo Router screen for GIRO Mobile.

## Requirements

- Expo Router 3.0+ file-based routing
- NativeWind (TailwindCSS) styling
- TanStack Query for data fetching
- Zod for validation
- Proper TypeScript types

## Screen Template

```tsx
// app/(tabs)/{name}.tsx
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { {Name}Card } from '@/components/features/{name}';
import { LoadingSpinner } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error';

export default function {Name}Screen() {
  const { data, isLoading, error, refetch, isRefreshing } = useQuery({
    queryKey: ['{name}s'],
    queryFn: () => api.get('/api/{name}s'),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <{Name}Card item={item} />}
        contentContainerClassName="p-4 gap-3"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-8">
            Nenhum {name} encontrado
          </Text>
        }
      />
    </View>
  );
}
```

## Component Template

```tsx
// components/features/{name}/{Name}Card.tsx
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { cn } from '@/utils/cn';

interface {Name}CardProps {
  item: {Name};
  className?: string;
}

export function {Name}Card({ item, className }: {Name}CardProps) {
  return (
    <Link href={`/{name}/${item.id}`} asChild>
      <Pressable
        className={cn(
          'bg-white rounded-xl p-4 shadow-sm',
          'active:bg-gray-50',
          className
        )}
      >
        <Text className="text-lg font-semibold text-gray-900">
          {item.name}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          {item.description}
        </Text>
      </Pressable>
    </Link>
  );
}
```
