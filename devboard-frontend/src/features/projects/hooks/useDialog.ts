import { useEffect, useRef, useState } from "react";

export default function useDialog(){

    const dialogRef = useRef<HTMLDialogElement>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    function openDialog() {
        setIsOpen(true)
    }
    function closeDialog() {
        setIsOpen(false);
    }

    useEffect(() => {
            if (isOpen) {
                dialogRef.current?.showModal();
            } else {
                dialogRef.current?.close();
            }
        }, [isOpen]);

    return { dialogRef, openDialog, closeDialog };
}

