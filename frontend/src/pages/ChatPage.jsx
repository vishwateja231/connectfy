import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken, ensureStreamUsers } from "../lib/api";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";

const ENV_STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId } = useParams();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser, // this will run only when authUser is available
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const initializedRef = useRef(false);
  const lastApiKeyRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const initChat = async () => {
      if (!tokenData?.token || !authUser || !targetUserId) {
        setLoading(false);
        return;
      }

      try {
        const apiKey = tokenData?.apiKey; // enforce server-provided key to match token
        if (!apiKey) {
          throw new Error("Missing Stream API key from backend token endpoint.");
        }

        // Ensure both users exist in Stream before channel creation
        try {
          await ensureStreamUsers([authUser._id, targetUserId]);
        } catch (e) {
          console.error("ensureStreamUsers failed", e);
          throw new Error("Failed to prepare chat users.");
        }

        // If apiKey changed across renders, ensure previous client is disconnected
        if (lastApiKeyRef.current && lastApiKeyRef.current !== apiKey && chatClient) {
          await chatClient.disconnectUser();
        }

        const client = StreamChat.getInstance(apiKey);

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        const channelId = [authUser._id, targetUserId].sort().join("-");

        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        if (isCancelled) return;
        setChatClient(client);
        setChannel(currChannel);
        initializedRef.current = true;
        lastApiKeyRef.current = apiKey;
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error(error?.message || "Could not connect to chat. Please try again.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    initChat();

    return () => {
      isCancelled = true;
      if (chatClient) {
        chatClient.disconnectUser();
      }
      initializedRef.current = false;
      lastApiKeyRef.current = null;
      setChatClient(null);
      setChannel(null);
    };
    // include targetUserId so navigating between friends re-initializes
  }, [tokenData?.token, tokenData?.apiKey, authUser?._id, targetUserId]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent successfully!");
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
    <div className="h-[93vh]">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full relative">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
export default ChatPage;
