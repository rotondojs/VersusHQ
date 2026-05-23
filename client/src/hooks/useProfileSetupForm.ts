import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { updateUser, uploadUserPicture } from "../services/userService";
import useLoginContext from "./useLoginContext";

/**
 * Custom hook to manage profile setup form logic.
 * @returns An object containing:
 *   - display: The current value of the display name input
 *   - email: The current value of the email input
 *   - name: The current value of the name input
 *   - picture: The current value of the picture URL input
 *   - err: The current error message, if any.
 *   - handleInputChange: Function to handle changes in input fields.
 *   - handleSubmit: Function to handle form submission.
 */
export default function useProfileSetupForm() {
  const { user, pass, googleId } = useLoginContext();
  const [display, setDisplay] = useState<string | null>(user.display ?? null);
  const [picture, setPicture] = useState<string | null>(user.picture ?? null);
  const [name, setName] = useState<string | null>(user.name ?? null);
  const [email, setEmail] = useState<string | null>(user.email ?? null);
  const [bio, setBio] = useState<string | null>(user.bio ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const profileSetupMutation = useMutation({
    mutationFn: async () => {
      let pictureUrl = picture ?? undefined;

      if (selectedFile) {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(selectedFile);
        });

        if (dataUrl) {
          const uploadResponse = await uploadUserPicture(
            { username: user.username, password: pass, googleId },
            dataUrl,
          );

          if ("error" in uploadResponse) {
            throw new Error(uploadResponse.error);
          }

          pictureUrl = uploadResponse.picture ?? pictureUrl;
        }
      }

      const response = await updateUser(
        { username: user.username, password: pass, googleId },
        {
          name: name ?? undefined,
          picture: pictureUrl,
          display: display ?? undefined,
          email: email ?? undefined,
          bio: bio ?? undefined,
          lastLogin: new Date(),
        },
      );

      if ("error" in response) {
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      navigate("/");
    },
  });

  /**
   * Handles changes in input fields and updates the corresponding state.
   *
   * @param e - The input change event.
   * @param field - The field being updated ('picture', 'display', 'email', 'name', or 'bio').
   */
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: "picture" | "display" | "email" | "name" | "bio",
  ) => {
    if (field === "picture") {
      setPicture(e.target.value);
    } else if (field === "display") {
      setDisplay(e.target.value);
    } else if (field === "name") {
      setName(e.target.value);
    } else if (field === "bio") {
      setBio(e.target.value);
    } else {
      setEmail(e.target.value);
    }
  };

  /**
   * Handles the submission of the profile setup form.
   * Updates the user's profile information and navigates to the home page on
   * success.
   *
   * @param event - The form submission event.
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErr(null);
    try {
      await profileSetupMutation.mutateAsync();
    } catch (caughtError) {
      setErr(
        caughtError instanceof Error ? caughtError.message : "Unable to save profile right now.",
      );
    }
  };

  /**
   * Stores the currently selected profile-picture file for later upload.
   */
  const handleSelectedFile = (file: File | null) => {
    setSelectedFile(file);
  };

  return {
    handleInputChange,
    handleSubmit,
    display,
    email,
    name,
    bio,
    picture,
    err,
    isSubmitting: profileSetupMutation.isPending,
    handleSelectedFile,
  };
}
