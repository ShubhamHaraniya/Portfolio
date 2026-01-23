import cv2
import numpy as np

def fix_transparency(input_file, output_file):
    # 1. Load Image (Keep it 3 channels: Blue, Green, Red)
    # Do NOT convert to BGRA yet.
    img = cv2.imread(input_file)
    if img is None:
        print(f"Error: Could not open {input_file}. Check the filename!")
        return

    # 2. Create a Mask (Height+2, Width+2)
    # This is strictly required by the floodFill function.
    h, w = img.shape[:2]
    mask = np.zeros((h+2, w+2), np.uint8)

    # 3. Find the Background
    # We run floodFill on a COPY. The important part is that it updates the 'mask'.
    # We start from the top-left corner (0,0).
    img_temp = img.copy()
    seed_point = (0, 0)
    
    # loDiff/upDiff=20 helps catch "noisy" grey pixels in the background
    cv2.floodFill(img_temp, mask, seed_point, (255, 0, 0), loDiff=(20, 20, 20), upDiff=(20, 20, 20))

    # 4. Apply Transparency
    # Now we convert the ORIGINAL image to 4 channels.
    img_final = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    # The mask has a generic '1' wherever it found background.
    # We remove the extra border [1:-1, 1:-1] to match image size.
    background_area = mask[1:-1, 1:-1] > 0
    
    # Set Alpha (channel 3) to 0 wherever the background was found
    img_final[background_area] = (0, 0, 0, 0)

    # 5. Save
    cv2.imwrite(output_file, img_final)
    print(f"Success! Saved to {output_file}")

# --- IMPORTANT ---
# Make sure 'image_e5dc17.png' is your ORIGINAL file with the grey background.
# If you use a file you already tried to fix, it might not work.
fix_transparency('favicon.png', 'favicon_final.png')