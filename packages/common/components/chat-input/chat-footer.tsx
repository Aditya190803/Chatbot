import { Flex } from '@repo/ui';
import Link from 'next/link';

export const ChatFooter = () => {
  return (
    <Flex className="w-full p-2" justify="center" gap="xs">
      <p className="text-xs opacity-50">
        Chatbot is open source and your data is stored locally. project by{' '}
        <Link
          href="https://Adityamer.live"
          target="_blank"
          className="text-brand decoration-brand inline-block underline underline-offset-2"
        >
          Adityamer.live
        </Link>
      </p>
    </Flex>
  );
};
