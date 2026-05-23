import { type SubmitEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import useLoginContext from "./useLoginContext.ts";
import useAuth from "./useAuth.ts";
import { updateUser, uploadUserPicture } from "../services/userService.ts";
import type { UserUpdateRequest } from "@gamenite/shared";

/**
 * Custom hook to manage profile form logic
 * @returns an object containing
 *  - Form values `display`, `password`, and `confirm`
 *  - Form setters `setDisplay`, `setPassword`, and `setConfirm`
 *  - Possibly-null error message `err`
 *  - Submission handler `handleSubmit`
 */
export default function useEditProfileForm() {
  const { user, reset } = useLoginContext();
  const [display, setDisplay] = useState(user.display);
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [err, setErr] = useState<null | string>(null);
  const auth = useAuth();
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let pictureUrl = user.picture ?? undefined;
      if (selectedFile) {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(selectedFile);
        });

        if (dataUrl) {
          const uploadResponse = await uploadUserPicture(auth, dataUrl);

          if ("error" in uploadResponse) {
            throw new Error(uploadResponse.error);
          }

          pictureUrl = uploadResponse.picture ?? pictureUrl;
        }
      }

      const updates: UserUpdateRequest = {};
      if (display !== user.display) updates.display = display;
      if (password !== "") updates.password = password;
      if (email !== user.email) updates.email = email;
      if (name !== user.name) updates.name = name;
      if (bio !== user.bio) updates.bio = bio;
      if (pictureUrl !== user.picture) updates.picture = pictureUrl;

      const updateResponse = await updateUser(auth, updates);
      if ("error" in updateResponse) {
        throw new Error(updateResponse.error);
      }
    },
    onSuccess: () => {
      reset();
    },
  });

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);

    if (
      user.display === display &&
      user.email === email &&
      user.name === name &&
      user.bio === bio &&
      password === confirm &&
      password === "" &&
      !selectedFile
    ) {
      setErr("No changes to submit");
      return;
    }

    if (display.trim() !== display) {
      setErr("Display names can't begin or end with whitespace");
      return;
    }

    if (display.trim() === "") {
      setErr("Please enter a display name");
      return;
    }

    if (password.trim() !== password) {
      setErr("Passwords can't begin or end with whitespace");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync();
    } catch (caughtError) {
      setErr(
        caughtError instanceof Error ? caughtError.message : "Unable to update profile right now.",
      );
    }
  };

  return {
    display,
    setDisplay,
    password,
    setPassword,
    email,
    setEmail,
    name,
    setName,
    bio,
    setBio,
    confirm,
    setConfirm,
    err,
    isSubmitting: updateProfileMutation.isPending,
    handleSubmit,
    handleSelectedFile: (file: File | null) => setSelectedFile(file),
  };
}
